using System.Globalization;
using UnityEngine;

// The Jarvis head. The host app drives it with Unity's SendMessage on the "Jarvis" object:
//   SetMode("idle" | "thinking" | "speaking")
//   SetLook("x,y")  viewer position in -1..1 screen space (x right, y down), or "off" to stop looking at them
[RequireComponent(typeof(MeshFilter), typeof(MeshRenderer))]
public class JarvisAvatar : MonoBehaviour
{
    public Camera cam;

    static readonly int MouthId = Shader.PropertyToID("_Mouth"), GlowId = Shader.PropertyToID("_Glow"), FlowId = Shader.PropertyToID("_Flow");
    string mode = "idle";
    Vector2 look;
    bool tracking;
    float flow, mouth, glow, yaw = 1f, pitch;
    Material mat;

    void Awake()
    {
        // a head model assigned in the editor (e.g. an imported scan) wins; its mouth won't animate (no UV1 weights)
        var mf = GetComponent<MeshFilter>();
        if (!mf.sharedMesh) mf.sharedMesh = HeadMeshBuilder.Build();
        mat = GetComponent<MeshRenderer>().material;
        if (!cam) cam = Camera.main;
    }

    public void SetMode(string value) => mode = value;

    public void SetLook(string xy)
    {
        var p = xy.Split(',');
        tracking = p.Length == 2
            && float.TryParse(p[0], NumberStyles.Float, CultureInfo.InvariantCulture, out look.x)
            && float.TryParse(p[1], NumberStyles.Float, CultureInfo.InvariantCulture, out look.y);
    }

    void Update()
    {
        float dt = Mathf.Min(.05f, Time.deltaTime), t = Time.time;
        bool speaking = mode == "speaking", thinking = mode == "thinking";

        flow += dt * (thinking ? 6 : 1);
        float mouthTarget = speaking ? Mathf.Max(0, .5f + .5f * Mathf.Sin(t * 17) * (.6f + .4f * Mathf.Sin(t * 5.3f))) : 0;
        mouth += (mouthTarget - mouth) * .35f;
        glow += ((speaking ? .55f : thinking ? .3f : 0) - glow) * .08f;
        mat.SetFloat(MouthId, mouth);
        mat.SetFloat(GlowId, glow);
        mat.SetFloat(FlowId, flow);

        // wide stage: head sits right of the caption; narrow (phone): centred and higher
        bool narrow = cam.aspect < 1.1f;
        transform.position = narrow ? new Vector3(0, .6f, 0) : new Vector3(.6f, .05f, 0);
        cam.transform.position = new Vector3(0, 0, narrow ? -7.2f : -5.6f);

        // tracking: turn to face the viewer; idle: rest in profile, swaying slightly
        float yawTarget = tracking ? look.x * .7f : 1f + Mathf.Sin(t * .25f) * .12f;
        float pitchTarget = tracking ? look.y * .3f : Mathf.Sin(t * .33f) * .04f;
        yaw += (yawTarget - yaw) * .07f;
        pitch += (pitchTarget - pitch) * .07f;
        transform.rotation = Quaternion.Euler(-pitch * Mathf.Rad2Deg, -yaw * Mathf.Rad2Deg, 0); // negated: Unity axes are left-handed
    }
}
