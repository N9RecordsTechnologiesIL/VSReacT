#pragma once

#include <juce_events/juce_events.h>

#include <functional>
#include <map>

namespace vsreact
{

/** One-shot timer table driving the JS setTimeout shim. The JS side re-arms
    intervals itself, so C++ only ever deals in one-shot deadlines. */
class Scheduler : private juce::Timer
{
public:
    std::function<void (int id)> onFire;

    void setTimer (int id, int ms);
    void clearTimer (int id);

    /** Fires every due timer now. The message-loop timer calls this; unit
        tests call it directly instead of pumping a message loop. */
    void checkNow();

    int numPending() const noexcept { return static_cast<int> (deadlines.size()); }

private:
    void timerCallback() override { checkNow(); }

    std::map<int, double> deadlines;
};

} // namespace vsreact
