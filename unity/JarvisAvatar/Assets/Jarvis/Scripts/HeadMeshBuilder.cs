using System.IO;
using UnityEngine;
using UnityEngine.Rendering;

// Loads the head scan from Resources/head.bytes (written by scripts/head/export-head.mjs).
// The file is in three.js space (+z = face); it is mirrored to Unity's left-handed space so the face looks at -z.
// UV channel 1 (x) holds how much each vertex drops when the mouth opens.
public static class HeadMeshBuilder
{
    public static Mesh Build()
    {
        var asset = Resources.Load<TextAsset>("head");
        if (!asset) throw new FileNotFoundException("Resources/head.bytes is missing; run node scripts/head/export-head.mjs");

        using var r = new BinaryReader(new MemoryStream(asset.bytes));
        if (new string(r.ReadChars(4)) != "JHD1") throw new InvalidDataException("head.bytes is not a JHD1 file");
        int v = (int)r.ReadUInt32(), n = (int)r.ReadUInt32();

        var pos = new Vector3[v];
        var nrm = new Vector3[v];
        var mouth = new Vector2[v];
        var tris = new int[n];
        for (int i = 0; i < v; i++) pos[i] = new Vector3(r.ReadSingle(), r.ReadSingle(), -r.ReadSingle());
        for (int i = 0; i < v; i++) nrm[i] = new Vector3(r.ReadSingle(), r.ReadSingle(), -r.ReadSingle());
        for (int i = 0; i < v; i++) mouth[i] = new Vector2(r.ReadSingle(), 0);
        for (int i = 0; i < n; i++) tris[i] = r.ReadUInt16();
        for (int i = 0; i < n; i += 3) (tris[i + 1], tris[i + 2]) = (tris[i + 2], tris[i + 1]); // mirroring flips winding

        var mesh = new Mesh { name = "JarvisHead", indexFormat = v > 65535 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
        mesh.vertices = pos;
        mesh.normals = nrm;
        mesh.SetUVs(1, mouth);
        mesh.triangles = tris;
        mesh.RecalculateBounds();
        return mesh;
    }
}
