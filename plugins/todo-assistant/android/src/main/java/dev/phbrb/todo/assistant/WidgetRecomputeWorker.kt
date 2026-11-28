package dev.phbrb.todo.assistant

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

/**
 * Recomputes the widget's highlight ranking from the DataStore state mirror
 * (runs even while the app is closed). Scheduled periodically (min 15 min on
 * Android) and once at boot / plugin load.
 */
class WidgetRecomputeWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val stateJson = ctx.mirrorDataStore.data.first()[MirrorKeys.STATE_JSON] ?: return Result.success()
        val widgetJson = WidgetRanker.computeWidgetJson(ctx, stateJson) ?: return Result.success()
        ctx.mirrorDataStore.updateData { prefs ->
            prefs.toMutablePreferences().apply { this[MirrorKeys.WIDGET_JSON] = widgetJson }
        }
        TodoWidgetProvider.cachedWidgetJson = widgetJson
        TodoWidgetProvider.updateAll(ctx)
        return Result.success()
    }

    companion object {
        const val PERIODIC_NAME = "todo_widget_recompute"

        fun enqueue(context: Context) {
            val wm = workManager(context)
            val periodic = PeriodicWorkRequestBuilder<WidgetRecomputeWorker>(15, TimeUnit.MINUTES).build()
            wm.enqueueUniquePeriodicWork(PERIODIC_NAME, ExistingPeriodicWorkPolicy.KEEP, periodic)
            val now = OneTimeWorkRequestBuilder<WidgetRecomputeWorker>().build()
            wm.enqueueUniqueWork(PERIODIC_NAME + "_now", ExistingWorkPolicy.KEEP, now)
        }

        private fun workManager(ctx: Context): WorkManager = try {
            WorkManager.getInstance(ctx)
        } catch (e: IllegalStateException) {
            WorkManager.initialize(ctx, androidx.work.Configuration.Builder().build())
            WorkManager.getInstance(ctx)
        }
    }
}
