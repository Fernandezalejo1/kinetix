# KINETIX — Reglas ProGuard/R8 para el build release con minifyEnabled true.

# Capacitor usa reflexión para puentes JS -> nativo.
-keep class com.getcapacitor.** { *; }
-keep class com.kinetix.hypertrophy.** { *; }

# Plugin Health Connect (@capgo/capacitor-health): API anotada y reflexión interna.
-keep class ee.forgr.capacitor.health.** { *; }
-keep class androidx.health.connect.client.** { *; }
-keep class androidx.health.platform.client.** { *; }

# Local Notifications (@capacitor/local-notifications)
-keep class com.capacitorjs.plugins.localnotifications.** { *; }

# WebView JS bridge: conservar métodos anotados @JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Reglas genéricas recomendadas por Capacitor
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
-dontwarn androidx.**
