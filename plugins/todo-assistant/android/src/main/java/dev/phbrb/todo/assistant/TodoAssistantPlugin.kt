package dev.phbrb.todo.assistant

import android.webkit.WebView
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

object WebViewHolder {
    @Volatile
    var webView: WebView? = null
}

@CapacitorPlugin(name = "TodoAssistant")
class TodoAssistantPlugin : Plugin() {
    override fun load() {
        WebViewHolder.webView = bridge?.webView
    }
}
