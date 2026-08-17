#include "PresetManager.h"

namespace vsreact
{

namespace
{
    // User presets are plain files; the preset name is the file name. Strip
    // anything a filesystem (or a path traversal) would object to.
    juce::String sanitiseName (const juce::String& raw)
    {
        return juce::File::createLegalFileName (raw.trim()).substring (0, 64);
    }
}

PresetManager::PresetManager (juce::AudioProcessorValueTreeState& state, Options opts)
    : apvts (state), options (std::move (opts))
{
    directory = options.userDirectory != juce::File()
                    ? options.userDirectory
                    : juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                          .getChildFile (options.appName)
                          .getChildFile ("Presets");

    for (auto* parameter : apvts.processor.getParameters())
        if (auto* ranged = dynamic_cast<juce::RangedAudioParameter*> (parameter))
            if (ranged->getParameterID().isNotEmpty())
                parameterIds.add (ranged->getParameterID());

    for (const auto& id : parameterIds)
        apvts.addParameterListener (id, this);
}

PresetManager::~PresetManager()
{
    cancelPendingUpdate();

    for (const auto& id : parameterIds)
        apvts.removeParameterListener (id, this);
}

void PresetManager::attach (RootView& root)
{
    sendEvent = [&root] (const juce::String& name, const juce::var& payload)
    {
        root.sendNativeEvent (name, payload);
    };
}

void PresetManager::setEventSink (std::function<void (const juce::String&, const juce::var&)> sink)
{
    sendEvent = std::move (sink);
}

juce::File PresetManager::fileFor (const juce::String& name) const
{
    return directory.getChildFile (sanitiseName (name) + ".preset");
}

juce::StringArray PresetManager::orderedNames() const
{
    // Factory first (author's order), then user presets alphabetically —
    // the order every hardware-style prev/next walks.
    juce::StringArray names;

    for (const auto& preset : options.factoryPresets)
        names.add (preset.name);

    juce::StringArray user;

    for (const auto& entry : juce::RangedDirectoryIterator (directory, false, "*.preset"))
        user.add (entry.getFile().getFileNameWithoutExtension());

    user.sortNatural();

    for (const auto& name : user)
        if (! names.contains (name))
            names.add (name);

    return names;
}

juce::var PresetManager::snapshotList() const
{
    juce::Array<juce::var> list;
    const auto factoryCount = options.factoryPresets.size();
    const auto names = orderedNames();

    for (int i = 0; i < names.size(); ++i)
    {
        auto* entry = new juce::DynamicObject();
        entry->setProperty ("name", names[i]);
        entry->setProperty ("factory", i < (int) factoryCount);
        list.add (juce::var (entry));
    }

    return juce::var (list);
}

juce::var PresetManager::stateEvent() const
{
    auto* payload = new juce::DynamicObject();
    payload->setProperty ("current", current);
    payload->setProperty ("dirty", dirty);
    payload->setProperty ("presets", snapshotList());
    return juce::var (payload);
}

void PresetManager::emitState()
{
    if (sendEvent != nullptr)
        sendEvent ("preset", stateEvent());
}

bool PresetManager::loadByName (const juce::String& name)
{
    const juce::ScopedValueSetter<bool> applying (applyingPreset, true);

    for (const auto& preset : options.factoryPresets)
    {
        if (preset.name != name)
            continue;

        for (const auto& [id, natural] : preset.values)
            if (auto* parameter = apvts.getParameter (id))
                parameter->setValueNotifyingHost (parameter->convertTo0to1 (natural));

        return true;
    }

    const auto file = fileFor (name);

    if (! file.existsAsFile())
        return false;

    if (auto xml = juce::parseXML (file))
    {
        // Restore through the parameters (not replaceState) so hosts see the
        // moves and any values missing from an old file keep their defaults.
        const auto tree = juce::ValueTree::fromXml (*xml);

        if (! tree.isValid())
            return false;

        apvts.replaceState (tree);
        return true;
    }

    return false;
}

std::optional<juce::var> PresetManager::handleNativeCall (const juce::String& name, const juce::var& args)
{
    if (! name.startsWith ("preset:"))
        return std::nullopt;

    const auto ok = [] (bool value)
    {
        auto* result = new juce::DynamicObject();
        result->setProperty ("ok", value);
        return juce::var (result);
    };

    if (name == "preset:list")
        return stateEvent();

    if (name == "preset:load")
    {
        const auto target = args["name"].toString();
        const bool loaded = loadByName (target);

        if (loaded)
        {
            current = target;
            dirty = false;
            emitState();
        }

        return ok (loaded);
    }

    if (name == "preset:save")
    {
        const auto target = sanitiseName (args["name"].toString());

        if (target.isEmpty())
            return ok (false);

        // Factory names are reserved — shadowing one would make prev/next
        // ambiguous about which "Default" it means.
        for (const auto& preset : options.factoryPresets)
            if (preset.name == target)
                return ok (false);

        directory.createDirectory();

        const auto xml = apvts.copyState().createXml();

        if (xml == nullptr || ! fileFor (target).replaceWithText (xml->toString()))
            return ok (false);

        current = target;
        dirty = false;
        emitState();
        return ok (true);
    }

    if (name == "preset:delete")
    {
        const auto target = args["name"].toString();

        for (const auto& preset : options.factoryPresets)
            if (preset.name == target)
                return ok (false);

        const auto file = fileFor (target);
        const bool removed = file.existsAsFile() && file.deleteFile();

        if (removed)
        {
            if (current == target)
                current = "";

            emitState();
        }

        return ok (removed);
    }

    if (name == "preset:next" || name == "preset:prev")
    {
        const auto names = orderedNames();

        if (names.isEmpty())
            return ok (false);

        const auto count = names.size();
        const auto index = names.indexOf (current);

        // Unknown current (-1): next lands on the first, prev on the last.
        const auto targetIndex = name == "preset:next"
                                     ? (index < 0 ? 0 : (index + 1) % count)
                                     : (index < 0 ? count - 1 : (index - 1 + count) % count);
        const auto target = names[targetIndex];

        if (! loadByName (target))
            return ok (false);

        current = target;
        dirty = false;
        emitState();
        return ok (true);
    }

    return juce::var();
}

void PresetManager::parameterChanged (const juce::String&, float)
{
    // Audio thread. A self-inflicted change (loading a preset) is not an
    // edit; anything else dirties the loaded preset exactly once.
    if (applyingPreset || dirty)
        return;

    dirty = true;
    triggerAsyncUpdate();
}

void PresetManager::handleAsyncUpdate()
{
    emitState();
}

} // namespace vsreact
