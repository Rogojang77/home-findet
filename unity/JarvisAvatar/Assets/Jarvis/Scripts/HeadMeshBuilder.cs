using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

// Procedural head: a sphere sculpted into a face, plus an open neck cylinder (port of src/lib/avatar.js).
// Built in three.js coordinates (+z = face), then mirrored to Unity's left-handed space so the face looks at -z.
// UV channel 1 (x) holds how much each vertex moves when the mouth opens.
public static class HeadMeshBuilder
{
    static float Sq(float v) => v * v;
    static float Ss(float a, float b, float v) { float t = Mathf.Clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
    static float G2(float x, float y, float cx, float cy, float sx, float sy) => Mathf.Exp(-Sq((x - cx) / sx) - Sq((y - cy) / sy));

    public static Mesh Build()
    {
        var verts = new List<Vector3>();
        var mouth = new List<Vector2>();
        var tris = new List<int>();
        AddHead(verts, mouth, tris, 220, 220);
        AddNeck(verts, mouth, tris, 160, 80);

        for (int i = 0; i < verts.Count; i++) verts[i] = new Vector3(verts[i].x, verts[i].y, -verts[i].z);
        for (int i = 0; i < tris.Count; i += 3) (tris[i + 1], tris[i + 2]) = (tris[i + 2], tris[i + 1]); // mirroring flips winding

        var mesh = new Mesh { name = "JarvisHead", indexFormat = IndexFormat.UInt32 };
        mesh.SetVertices(verts);
        mesh.SetUVs(1, mouth);
        mesh.SetTriangles(tris, 0);
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        return mesh;
    }

    static void AddHead(List<Vector3> v, List<Vector2> m, List<int> t, int W, int H)
    {
        int start = v.Count;
        for (int iy = 0; iy <= H; iy++)
        for (int ix = 0; ix <= W; ix++)
        {
            float phi = (float)ix / W * Mathf.PI * 2, theta = (float)iy / H * Mathf.PI;
            float px = -Mathf.Cos(phi) * Mathf.Sin(theta), py = Mathf.Cos(theta), pz = Mathf.Sin(phi) * Mathf.Sin(theta);
            float x = px * .78f, y = py * 1.05f, z = pz * .9f;
            float front = Ss(.15f, .75f, pz);
            if (py < 0) { x *= 1 - .28f * Ss(0, -1, py); if (pz < 0) z *= 1 - .4f * Ss(-.1f, -.9f, py); } // jaw, skull base
            z -= .12f * Ss(.35f, 1, py) * front;                                                             // sloped forehead
            float ax = Mathf.Abs(x), noseW = .07f + .07f * Ss(-.02f, -.2f, y);
            float face =
                  .18f * Mathf.Exp(-Sq(x / noseW)) * Ss(.22f, -.17f, y) * (1 - Ss(-.19f, -.27f, y))  // nose
                + .10f * (G2(x, y, .09f, -.18f, .05f, .045f) + G2(x, y, -.09f, -.18f, .05f, .045f))  // nostril wings
                + .06f * Mathf.Exp(-Sq((y - .27f) / .07f)) * Ss(.5f, .2f, ax)                        // brow ridge
                - .09f * G2(ax, y, .27f, .12f, .12f, .09f)                                            // eye sockets
                + .045f * G2(ax, y, .27f, .11f, .075f, .05f)                                          // closed eyelids
                + .05f * G2(ax, y, .42f, -.1f, .18f, .2f)                                             // cheekbones
                + .075f * G2(x, y, 0, -.42f, .2f, .05f) - .035f * G2(x, y, 0, -.475f, .22f, .02f)     // upper lip, mouth line
                + .065f * G2(x, y, 0, -.535f, .17f, .045f)                                            // lower lip
                + .07f * G2(x, y, 0, -.78f, .14f, .11f);                                              // chin
            z += face * front;
            x += Mathf.Sign(px) * .1f * G2(z, y, -.05f, 0, .09f, .17f) * Ss(.55f, .9f, Mathf.Abs(px)); // ears
            v.Add(new Vector3(x, y, z));
            m.Add(new Vector2(Ss(-.47f, -.62f, y) * front * Mathf.Exp(-Sq(x / .35f)), 0));
        }
        for (int iy = 0; iy < H; iy++)
        for (int ix = 0; ix < W; ix++)
        {
            int b = start + iy * (W + 1) + ix, a = b + 1, c = b + W + 1, d = a + W + 1;
            if (iy != 0) t.AddRange(new[] { a, b, d });
            if (iy != H - 1) t.AddRange(new[] { b, c, d });
        }
    }

    static void AddNeck(List<Vector3> v, List<Vector2> m, List<int> t, int radial, int rows)
    {
        const float top = .36f, bottom = .48f, h = 2.4f, tilt = .18f;
        float cs = Mathf.Cos(tilt), sn = Mathf.Sin(tilt);
        int start = v.Count;
        for (int iy = 0; iy <= rows; iy++)
        for (int ix = 0; ix <= radial; ix++)
        {
            float k = (float)iy / rows, r = top + k * (bottom - top), a = (float)ix / radial * Mathf.PI * 2;
            float x = r * Mathf.Sin(a), y = h / 2 - k * h, z = r * Mathf.Cos(a);
            v.Add(new Vector3(x, y * cs - z * sn - 1.45f, y * sn + z * cs - .12f)); // tilt back, sit under the jaw
            m.Add(Vector2.zero);
        }
        for (int iy = 0; iy < rows; iy++)
        for (int ix = 0; ix < radial; ix++)
        {
            int a = start + iy * (radial + 1) + ix, b = a + radial + 1, c = b + 1, d = a + 1;
            t.AddRange(new[] { a, b, d, b, c, d });
        }
    }
}
