export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface FreeWindow {
  start: string;
  end: string;
  durationHours: number;
}

export const calendarService = {
  // Fetch upcoming calendar events using user's access token
  async fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // next 7 days

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar API Error:", errorText);
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: any[] = data.items || [];

      return items.map((item: any) => ({
        id: item.id,
        summary: item.summary || "Busy Slot",
        description: item.description || "",
        start: {
          dateTime: item.start?.dateTime || item.start?.date,
          date: item.start?.date
        },
        end: {
          dateTime: item.end?.dateTime || item.end?.date,
          date: item.end?.date
        }
      }));
    } catch (err) {
      console.error("Error in calendarService.fetchUpcomingEvents:", err);
      throw err;
    }
  },

  // Process events to extract free work windows and busy blocks
  analyzeAvailability(events: CalendarEvent[], currentTimeStr?: string): { busySlots: any[]; freeWindows: FreeWindow[] } {
    const startRange = currentTimeStr ? new Date(currentTimeStr) : new Date();
    const endRange = new Date(startRange.getTime() + 2 * 24 * 60 * 60 * 1000); // 48-hour outlook

    const busySlots = events
      .map((ev) => {
        const start = new Date(ev.start.dateTime || ev.start.date || "");
        const end = new Date(ev.end.dateTime || ev.end.date || "");
        return { title: ev.summary, start, end };
      })
      .filter((slot) => {
        // filter slots within our 48h range and not in the past
        return slot.end > startRange && slot.start < endRange;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Compute free windows
    const freeWindows: FreeWindow[] = [];
    let currentPointer = new Date(startRange);

    for (const slot of busySlots) {
      if (slot.start > currentPointer) {
        const durationHours = (slot.start.getTime() - currentPointer.getTime()) / (1000 * 60 * 60);
        if (durationHours >= 0.5) { // Only count slots of at least 30 minutes
          freeWindows.push({
            start: currentPointer.toISOString(),
            end: slot.start.toISOString(),
            durationHours: parseFloat(durationHours.toFixed(1))
          });
        }
      }
      if (slot.end > currentPointer) {
        currentPointer = new Date(slot.end);
      }
    }

    // Window from last event to the end of range
    if (endRange > currentPointer) {
      const durationHours = (endRange.getTime() - currentPointer.getTime()) / (1000 * 60 * 60);
      if (durationHours >= 0.5) {
        freeWindows.push({
          start: currentPointer.toISOString(),
          end: endRange.toISOString(),
          durationHours: parseFloat(durationHours.toFixed(1))
        });
      }
    }

    return {
      busySlots: busySlots.map((s) => ({
        title: s.title,
        start: s.start.toISOString(),
        end: s.end.toISOString()
      })),
      freeWindows
    };
  }
};
