using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Menu "Jarvis": builds the scene from code and exports the WebGL build the React app loads.
public static class JarvisSetup
{
    const string ScenePath = "Assets/Jarvis/Jarvis.unity";
    const string MaterialPath = "Assets/Jarvis/ContourHead.mat";

    // Files land as public/unity/Build/unity.* (Unity names them after the output folder); see src/lib/unityAvatar.js
    static string OutDir => Path.GetFullPath(Path.Combine(Application.dataPath, "../../../public/unity"));

    [MenuItem("Jarvis/Create Scene")]
    public static void CreateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        var camGo = new GameObject("Main Camera", typeof(Camera)) { tag = "MainCamera" };
        var cam = camGo.GetComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color32(0x0c, 0x11, 0x24, 0xff);
        cam.fieldOfView = 28;
        cam.nearClipPlane = .1f;
        cam.farClipPlane = 50;
        camGo.transform.position = new Vector3(0, 0, -5.6f);

        var mat = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
        if (!mat)
        {
            mat = new Material(Shader.Find("Jarvis/ContourHead"));
            AssetDatabase.CreateAsset(mat, MaterialPath);
        }

        // the name "Jarvis" is what the web page targets with SendMessage
        var head = new GameObject("Jarvis", typeof(MeshFilter), typeof(MeshRenderer), typeof(JarvisAvatar));
        head.GetComponent<MeshRenderer>().sharedMaterial = mat;
        head.GetComponent<JarvisAvatar>().cam = cam;

        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        Debug.Log("Jarvis scene created: " + ScenePath);
    }

    [MenuItem("Jarvis/Build WebGL for the web app")]
    public static void BuildWebGL()
    {
        if (!File.Exists(ScenePath)) CreateScene();
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled; // Vite serves files without Content-Encoding headers
        PlayerSettings.runInBackground = true;
        var report = BuildPipeline.BuildPlayer(new[] { ScenePath }, OutDir, BuildTarget.WebGL, BuildOptions.None);
        Debug.Log($"Jarvis WebGL build: {report.summary.result} → {OutDir}");
    }
}
