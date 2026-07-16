#include "Scheduler.h"

namespace vsreact
{

void Scheduler::setTimer (int id, int ms)
{
    deadlines[id] = juce::Time::getMillisecondCounterHiRes() + ms;

    if (! isTimerRunning())
        startTimer (4);
}

void Scheduler::clearTimer (int id)
{
    deadlines.erase (id);

    if (deadlines.empty())
        stopTimer();
}

void Scheduler::checkNow()
{
    const auto now = juce::Time::getMillisecondCounterHiRes();

    std::vector<int> due;

    for (const auto& [id, deadline] : deadlines)
        if (deadline <= now)
            due.push_back (id);

    for (const auto id : due)
        deadlines.erase (id);

    // onFire may re-arm timers, so mutate the map before dispatching.
    for (const auto id : due)
        if (onFire != nullptr)
            onFire (id);

    if (deadlines.empty())
        stopTimer();
}

} // namespace vsreact
