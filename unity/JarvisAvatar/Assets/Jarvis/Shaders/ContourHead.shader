// Glowing red contour lines flowing over a blue-lit head (port of the GLSL in src/lib/avatar.js).
// Unlit: lighting is computed here, so it renders the same in the Built-in pipeline and URP.
Shader "Jarvis/ContourHead"
{
    Properties
    {
        _Mouth ("Mouth open", Range(0, 1)) = 0
        _Glow ("Line glow", Range(0, 1)) = 0
        _Flow ("Flow time", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            float _Mouth, _Glow, _Flow;

            struct appdata { float4 vertex : POSITION; float3 normal : NORMAL; float2 mouth : TEXCOORD1; };
            struct v2f { float4 pos : SV_POSITION; float3 obj : TEXCOORD0; float3 n : TEXCOORD1; float3 v : TEXCOORD2; };

            // Ashima 3D simplex noise (MIT)
            float3 mod289(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            float4 mod289(float4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            float4 permute(float4 x) { return mod289(((x * 34.0) + 1.0) * x); }
            float4 taylorInvSqrt(float4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(float3 v)
            {
                const float2 C = float2(1.0 / 6.0, 1.0 / 3.0);
                const float4 D = float4(0.0, 0.5, 1.0, 2.0);
                float3 i = floor(v + dot(v, C.yyy));
                float3 x0 = v - i + dot(i, C.xxx);
                float3 g = step(x0.yzx, x0.xyz);
                float3 l = 1.0 - g;
                float3 i1 = min(g.xyz, l.zxy);
                float3 i2 = max(g.xyz, l.zxy);
                float3 x1 = x0 - i1 + C.xxx;
                float3 x2 = x0 - i2 + C.yyy;
                float3 x3 = x0 - D.yyy;
                i = mod289(i);
                float4 p = permute(permute(permute(i.z + float4(0.0, i1.z, i2.z, 1.0)) + i.y + float4(0.0, i1.y, i2.y, 1.0)) + i.x + float4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                float3 ns = n_ * D.wyz - D.xzx;
                float4 j = p - 49.0 * floor(p * ns.z * ns.z);
                float4 x_ = floor(j * ns.z);
                float4 y_ = floor(j - 7.0 * x_);
                float4 x = x_ * ns.x + ns.yyyy;
                float4 y = y_ * ns.x + ns.yyyy;
                float4 h = 1.0 - abs(x) - abs(y);
                float4 b0 = float4(x.xy, y.xy);
                float4 b1 = float4(x.zw, y.zw);
                float4 s0 = floor(b0) * 2.0 + 1.0;
                float4 s1 = floor(b1) * 2.0 + 1.0;
                float4 sh = -step(h, 0.0);
                float4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
                float4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
                float3 p0 = float3(a0.xy, h.x);
                float3 p1 = float3(a0.zw, h.y);
                float3 p2 = float3(a1.xy, h.z);
                float3 p3 = float3(a1.zw, h.w);
                float4 nm = taylorInvSqrt(float4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
                p0 *= nm.x; p1 *= nm.y; p2 *= nm.z; p3 *= nm.w;
                float4 m = max(0.6 - float4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m * m, float4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
            }

            v2f vert(appdata i)
            {
                v2f o;
                float3 p = i.vertex.xyz;
                p.y -= _Mouth * 0.07 * i.mouth.x;
                p.z += _Mouth * 0.025 * i.mouth.x; // lips move back, away from the camera
                o.obj = i.vertex.xyz;
                o.v = normalize(-UnityObjectToViewPos(p));
                o.n = normalize(mul((float3x3)UNITY_MATRIX_IT_MV, i.normal));
                o.pos = UnityObjectToClipPos(float4(p, 1.0));
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                float3 N = normalize(i.n), V = normalize(i.v);
                float fld = i.obj.y * 17.0 + 2.4 * snoise(i.obj * 1.4 + float3(0.0, 0.0, _Flow * 0.06)) + 0.9 * snoise(i.obj * 3.6 - _Flow * 0.04);
                float d = abs(frac(fld) - 0.5), w = fwidth(fld);
                float line = 1.0 - smoothstep(0.07, 0.07 + w * 1.5, d);
                float dif = max(dot(N, normalize(float3(0.8, 0.3, 0.6))), 0.0);
                float side = smoothstep(-0.5, 0.6, N.x);
                float3 base = float3(0.035, 0.05, 0.13) + float3(0.16, 0.32, 0.85) * pow(dif, 1.4) * 0.85;
                float3 hot = lerp(float3(1.0, 0.2, 0.1), float3(1.0, 0.48, 0.26), dif);
                float3 col = lerp(base, base * 0.35, line * 0.6) + hot * line * (0.6 + 0.35 * (1.0 - side) + _Glow);
                float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
                col += rim * lerp(float3(1.0, 0.25, 0.1), float3(0.3, 0.5, 1.0), side) * 0.7;
                #if !defined(UNITY_COLORSPACE_GAMMA)
                col = GammaToLinearSpace(col); // colours above are authored in sRGB
                #endif
                return float4(col, 1.0);
            }
            ENDCG
        }
    }
}
