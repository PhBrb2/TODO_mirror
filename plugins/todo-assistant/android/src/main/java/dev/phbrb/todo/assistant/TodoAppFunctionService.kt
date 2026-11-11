package dev.phbrb.todo.assistant

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.appfunctions.AppFunctionAppUnknownException
import androidx.appfunctions.AppFunctionDeclaration
import androidx.appfunctions.AppFunctionSerializable
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import kotlin.coroutines.resume

@RequiresApi(Build.VERSION_CODES.BAKLAVA)
@AppFunctionServiceEntryPoint(
    serviceName = "TodoAppFunctionService",
    appFunctionXmlFileName = "todo_app_function_service",
)
abstract class BaseTodoAppFunctionService : AppFunctionService() {

    /**
     * Creates a test task in the TODO app with fixed settings: title "Assistant test task", difficulty easy, no repeat, list todo.
     *
     * @return the created test task
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true)
    suspend fun createTestTask(): TestTask {
        val webView = WebViewHolder.webView
            ?: throw AppFunctionAppUnknownException("TODO app is not running")
        val raw = suspendCancellableCoroutine { cont ->
            webView.post {
                webView.evaluateJavascript(
                    "window.todoAssistant ? window.todoAssistant.createTestTask() : null"
                ) { value -> cont.resume(value ?: "null") }
            }
        }
        if (raw == "null") {
            throw AppFunctionAppUnknownException("TODO web app is not ready")
        }
        val obj = JSONObject(raw)
        return TestTask(taskId = obj.getLong("taskId"), title = obj.getString("title"))
    }
}

/** The test task created by the assistant. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class TestTask(
    /** The id of the created task. */
    val taskId: Long,
    /** The title of the created task. */
    val title: String,
)
