#version 310 es

#extension GL_GOOGLE_include_directive : enable

#include "constants.h"

layout(input_attachment_index = 0, set = 0, binding = 0) uniform highp subpassInput inputColor;

layout(set = 0, binding = 1) uniform sampler2D lutTextureSampler;

layout(location = 0) out highp vec4 outputColor;


// scaleOffset = vec3(1/lut_width, 1/lut_height, lut_height - 1)
highp vec3 apply2DLut(sampler2D lut, highp vec3 uvw, highp vec3 scaleOffset)
{
    uvw.z *= scaleOffset.z;
    highp float shift = floor(uvw.z);
    // Adding scaleOffset.xy * 0.5 ensures that the sample point is in the center of each texel in the LUT texture. 
    // Prevents any potential bias that could be introduced by sampling at the edge of a texel.
    uvw.xy = uvw.xy * scaleOffset.z * scaleOffset.xy + scaleOffset.xy * 0.5;
    uvw.x += shift * scaleOffset.y;
    uvw.xyz = mix(
        texture(lut, uvw.xy).rgb,
        texture(lut, uvw.xy + vec2(scaleOffset.y, 0.0)).rgb,
        uvw.z - shift
    );
    return uvw;
}

highp float convertGammaToLinear(highp float value)
{
    if (value <= 0.04045F)
        return value / 12.92F;
    else if (value < 1.0F)
        return pow((value + 0.055F)/1.055F, 2.4F);
    else
        return pow(value, 2.2F);
}

highp vec3 convertGammaToLinear(highp vec3 sRGB)
{
    return vec3(convertGammaToLinear(sRGB.r), convertGammaToLinear(sRGB.g), convertGammaToLinear(sRGB.b));
}

highp float convertLinearToGamma(highp float value)
{
    if (value <= 0.0F)
        return 0.0F;
    else if (value <= 0.0031308F)
        return 12.92F * value;
    else if (value < 1.0F)
        return 1.055F * pow(value, 0.4166667F) - 0.055F;
    else
        return pow(value, 0.45454545F);
}

highp vec3 convertLinearToGamma(highp vec3 linRGB)
{
    return vec3(convertLinearToGamma(linRGB.r), convertLinearToGamma(linRGB.g), convertLinearToGamma(linRGB.b));
}

void main()
{
    highp ivec2 lutTextureSize = textureSize(lutTextureSampler, 0);
    highp float lutTextureHeight = float(lutTextureSize.y);
    highp float lutTextureWidth = float(lutTextureSize.x);
    highp vec4 color = subpassLoad(inputColor).rgba;

    color.xyz = convertGammaToLinear(color.xyz);
    color.xyz = apply2DLut(lutTextureSampler, color.xyz, vec3(1.0/lutTextureWidth, 1.0/lutTextureHeight, lutTextureHeight - 1.0));
    color.xyz = convertLinearToGamma(color.xyz);
    outputColor = color;
}
