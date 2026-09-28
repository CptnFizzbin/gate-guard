package com.cptnfizzbin.keycard.lib;

// TODO: delete this interface or switch KeycardConfig.logger to it - KeycardConfig.logger
// is a java.lang.System.Logger, so nothing uses this type
public interface Logger {
    default void warn(String message) {
        this.log(System.Logger.Level.WARNING, message);
    }

    void log(System.Logger.Level level, String message);
}
