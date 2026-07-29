#include "FontRegistry.h"

namespace vsreact
{

juce::MemoryBlock FontRegistry::decodeBytes (const juce::String& src)
{
    if (src.isEmpty())
        return {};

    if (src.startsWith ("data:"))
    {
        const auto comma = src.indexOfChar (',');
        if (comma < 0)
            return {};

        juce::MemoryOutputStream out;
        if (! juce::Base64::convertFromBase64 (out, src.substring (comma + 1)))
            return {};

        return out.getMemoryBlock();
    }

    juce::MemoryBlock mb;
    juce::File file (src);
    if (file.existsAsFile())
        file.loadFileAsData (mb);

    return mb;
}

bool FontRegistry::registerFont (const juce::String& family, const juce::String& src, int weight)
{
    const auto bytes = decodeBytes (src);
    if (bytes.getSize() == 0)
        return false;

    auto typeface = juce::Typeface::createSystemTypefaceFor (bytes.getData(), bytes.getSize());
    if (typeface == nullptr)
        return false;

    faces[family].push_back ({ weight, typeface });
    return true;
}

juce::Typeface::Ptr FontRegistry::find (const juce::String& family, int weight) const
{
    const auto it = faces.find (family);
    if (it == faces.end() || it->second.empty())
        return nullptr;

    const Face* best = &it->second.front();
    for (const auto& face : it->second)
        if (std::abs (face.weight - weight) < std::abs (best->weight - weight))
            best = &face;

    return best->typeface;
}

} // namespace vsreact
