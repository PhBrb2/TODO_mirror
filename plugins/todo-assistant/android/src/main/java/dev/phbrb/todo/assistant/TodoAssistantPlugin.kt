package dev.phbrb.todo.assistant

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.WebView
import androidx.annotation.RequiresApi
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

object WebViewHolder {
    @Volatile
    var webView: WebView? = null
}

@CapacitorPlugin(name = "TodoAssistant")
class TodoAssistantPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun load() {
        WebViewHolder.webView = bridge?.webView
        // Schedule the background widget recompute (also re-enqueued on boot).
        bridge?.context?.let { WidgetRecomputeWorker.enqueue(it) }
    }

    /**
     * One-way mirror of the web app's localStorage state into DataStore.
     * The WebView remains the source of truth; native components (widget, app
     * functions) read the mirror. Also refreshes the home-screen widget.
     */
    /**
     * Writes a backup JSON to the public Downloads folder (MediaStore on API 29+,
     * app-external Downloads dir on older). The plain `<a download>` flow does
     * nothing in a WebView without a download listener, which is why the file
     * was not found before.
     */
    @PluginMethod
    fun exportBackup(call: PluginCall) {
        val ctx = bridge?.context
        if (ctx == null) {
            call.reject("no context")
            return
        }
        val json = call.getString("json")
        if (json == null) {
            call.reject("no json")
            return
        }
        val filename = call.getString("filename") ?: "todo-backup.json"
        val path = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            writeViaMediaStore(ctx, filename, json)
        } else {
            writeViaExternalFilesDir(ctx, filename, json)
        }
        if (path != null) call.resolve(JSObject().put("path", path)) else call.reject("write failed")
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun writeViaMediaStore(ctx: android.content.Context, filename: String, json: String): String? {
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, filename)
            put(MediaStore.Downloads.MIME_TYPE, "application/json")
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return null
        ctx.contentResolver.openOutputStream(uri)?.use { it.write(json.toByteArray()) } ?: return null
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        ctx.contentResolver.update(uri, values, null, null)
        return "Download/$filename"
    }

    private fun writeViaExternalFilesDir(ctx: android.content.Context, filename: String, json: String): String? {
        val dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: return null
        val f = File(dir, filename)
        f.writeText(json)
        return f.absolutePath
    }

    @PluginMethod
    fun mirrorState(call: PluginCall) {
        val ctx = bridge?.context
        if (ctx == null) {
            call.reject("no context")
            return
        }
        val stateJson = call.getString("state") ?: "{}"
        val widgetJson = call.getString("widget") ?: "[]"
        scope.launch {
            ctx.mirrorDataStore.updateData { prefs ->
                prefs.toMutablePreferences().apply {
                    this[MirrorKeys.STATE_JSON] = stateJson
                    this[MirrorKeys.WIDGET_JSON] = widgetJson
                }
            }
            TodoWidgetProvider.cachedWidgetJson = widgetJson
            withContext(Dispatchers.Main) {
                TodoWidgetProvider.updateAll(ctx)
                call.resolve()
            }
        }
    }
}
