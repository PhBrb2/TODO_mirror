package dev.phbrb.todo.assistant

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.json.JSONArray

/**
 * Home-screen widget showing a very compact view of the highlighted tasks.
 * Reads the mirrored state from [mirrorDataStore] (cold start) or the in-memory
 * cache (warm), so it works even while the app is not running.
 */
class TodoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, id)
            } catch (e: Exception) {
                // Never let onUpdate throw: a crash here makes the launcher show
                // "widget could not be added". Fall back to an empty card.
                Log.e("TodoWidgetProvider", "updateWidget failed for $id", e)
                try {
                    val views = RemoteViews(context.packageName, R.layout.todo_widget)
                    for (i in 0 until MAX_ROWS) views.setViewVisibility(ROW_WRAP_IDS[i], View.GONE)
                    views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                    appWidgetManager.updateAppWidget(id, views)
                } catch (_: Exception) {
                }
            }
        }
    }

    companion object {
        private const val MAX_ROWS = 5
        private val ROW_WRAP_IDS = intArrayOf(R.id.rowwrap0, R.id.rowwrap1, R.id.rowwrap2, R.id.rowwrap3, R.id.rowwrap4)
        private val ROW_IDS = intArrayOf(R.id.row0, R.id.row1, R.id.row2, R.id.row3, R.id.row4)
        private val STRIPE_IDS = intArrayOf(R.id.stripe0, R.id.stripe1, R.id.stripe2, R.id.stripe3, R.id.stripe4)

        /** Difficulty stripe colors matching the web app's --diff-color values. */
        private fun difficultyColor(difficulty: String): Int = when (difficulty) {
            "easy" -> 0xFF70C4AE.toInt()
            "medium" -> 0xFFE9A470.toInt()
            "hard" -> 0xFFE08E87.toInt()
            "fun" -> 0xFFD63384.toInt()
            else -> 0xFF8A86A3.toInt()
        }

        /** Last widget payload seen in this process; avoids a disk read when warm. */
        @Volatile
        var cachedWidgetJson: String? = null

        private fun readWidgetJson(context: Context): String {
            cachedWidgetJson?.let { return it }
            // Cold start: read the mirror from DataStore (small file, one-shot).
            return try {
                runBlocking { context.mirrorDataStore.data.first()[MirrorKeys.WIDGET_JSON] } ?: "[]"
            } catch (e: Exception) {
                Log.e("TodoWidgetProvider", "failed to read mirror", e)
                "[]"
            }
        }

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.todo_widget)
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launch != null) {
                views.setOnClickPendingIntent(
                    R.id.widget_root,
                    PendingIntent.getActivity(
                        context,
                        0,
                        launch,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )
            }
            val items = try {
                JSONArray(readWidgetJson(context))
            } catch (_: Exception) {
                JSONArray()
            }
            var shown = 0
            for (i in 0 until minOf(items.length(), MAX_ROWS)) {
                val obj = items.optJSONObject(i) ?: continue
                views.setTextViewText(ROW_IDS[i], obj.optString("title", ""))
                views.setInt(STRIPE_IDS[i], "setColorFilter", difficultyColor(obj.optString("difficulty", "")))
                views.setViewVisibility(ROW_WRAP_IDS[i], View.VISIBLE)
                shown++
            }
            for (i in shown until MAX_ROWS) views.setViewVisibility(ROW_WRAP_IDS[i], View.GONE)
            views.setViewVisibility(R.id.widget_empty, if (shown == 0) View.VISIBLE else View.GONE)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun updateAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, TodoWidgetProvider::class.java))
            for (id in ids) updateWidget(context, mgr, id)
        }
    }
}
