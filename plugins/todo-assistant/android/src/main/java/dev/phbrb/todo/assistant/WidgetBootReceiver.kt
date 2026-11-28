package dev.phbrb.todo.assistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-enqueues the periodic widget recompute after a device reboot. */
class WidgetBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            WidgetRecomputeWorker.enqueue(context)
        }
    }
}
