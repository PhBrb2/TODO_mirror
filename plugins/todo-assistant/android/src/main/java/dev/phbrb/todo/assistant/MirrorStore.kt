package dev.phbrb.todo.assistant

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

/**
 * One-way mirror of the web app's localStorage state (`todo-mwe-state` JSON).
 * The WebView stays the source of truth and pushes the full state JSON here on
 * every save; native components (widget, app functions) read from this store.
 */
val Context.mirrorDataStore: DataStore<Preferences> by preferencesDataStore(name = "todo_mirror")

object MirrorKeys {
    /** Full `{schemaVersion, state}` JSON, same format as localStorage. */
    val STATE_JSON = stringPreferencesKey("stateJson")
    /** Compact precomputed widget payload: JSON array of {title}. */
    val WIDGET_JSON = stringPreferencesKey("widgetJson")
}
