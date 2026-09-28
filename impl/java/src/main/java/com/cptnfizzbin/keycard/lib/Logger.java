package com.cptnfizzbin.keycard.lib;

/** A sink for KeyCard's non-fatal diagnostics. */
public interface Logger {
    default void warn(String message) {
        this.log(System.Logger.Level.WARNING, message);
    }

    void log(System.Logger.Level level, String message);
}
