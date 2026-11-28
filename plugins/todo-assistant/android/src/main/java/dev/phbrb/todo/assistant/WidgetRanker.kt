package dev.phbrb.todo.assistant

import android.content.Context
import android.util.Log
import org.mozilla.javascript.Context as RhinoContext
import org.mozilla.javascript.ScriptableObject

/**
 * Runs the bundled game logic (assets/game-bundle.js, generated from docs/game-*.js
 * by scripts/build-game-bundle.mjs) in Rhino, so the widget can recompute the
 * current highlight ranking natively while the app is closed.
 */
object WidgetRanker {
    private const val TAG = "WidgetRanker"

    // Host shims for the only browser globals the game modules touch:
    // localStorage (state store) and window.dispatchEvent/CustomEvent (no-ops).
    private const val SHIM = """
        var window = this;
        window.dispatchEvent = function () {};
        function CustomEvent() {}
        var localStorage = {
            _m: {},
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
            setItem: function (k, v) { this._m[k] = String(v); },
            removeItem: function (k) { delete this._m[k]; }
        };
        localStorage.setItem("todo-mwe-state", MIRROR_JSON);
    """

    private const val COMPUTE = """
        (function () {
            var saved = GameBundle.loadState();
            if (saved) Object.assign(GameBundle.state, saved);
            return JSON.stringify(GameBundle.highlightTasks().slice(0, 5).map(function (t) {
                return { title: t.title, difficulty: t.difficulty === undefined ? null : t.difficulty };
            }));
        })()
    """

    /** @return widget payload JSON array string, or null on failure */
    fun computeWidgetJson(context: Context, stateJson: String): String? {
        val bundle = try {
            context.assets.open("game-bundle.js").readBytes().toString(Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "game-bundle.js missing from assets", e)
            return null
        }
        val cx = RhinoContext.enter()
        return try {
            cx.languageVersion = RhinoContext.VERSION_ES6
            val scope = cx.initStandardObjects()
            ScriptableObject.putProperty(scope, "MIRROR_JSON", stateJson)
            cx.evaluateString(scope, SHIM, "shim.js", 1, null)
            cx.evaluateString(scope, bundle, "game-bundle.js", 1, null)
            RhinoContext.toString(cx.evaluateString(scope, COMPUTE, "compute.js", 1, null))
        } catch (e: Exception) {
            Log.e(TAG, "highlight recompute failed", e)
            null
        } finally {
            RhinoContext.exit()
        }
    }
}
