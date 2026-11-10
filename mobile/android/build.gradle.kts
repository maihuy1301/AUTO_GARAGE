import com.android.build.api.variant.LibraryAndroidComponentsExtension

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    if (name == "tflite_flutter") {
        pluginManager.withPlugin("com.android.library") {
            // Match the Kotlin JVM target for this plugin.
            extensions.getByType<LibraryAndroidComponentsExtension>().finalizeDsl { android ->
                android.compileOptions.sourceCompatibility = JavaVersion.VERSION_17
                android.compileOptions.targetCompatibility = JavaVersion.VERSION_17
            }
        }
    }
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
