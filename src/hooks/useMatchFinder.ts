'use client';

import { useState } from 'react';

type MatchPageState = 
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "empty"; stats: any }
  | { status: "error"; message: string };

export function useMatchFinder() {
  const [state, setState] = useState<MatchPageState>({ status: "idle" });

  const findMatches = async (hospitalId: string, organs: string[], bloodType: string) => {
    setState({ status: "loading" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s hard timeout

    try {
      const response = await fetch('http://localhost:8000/api/match/find', { // Ensure port matches backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          required_organs: organs,
          patient_blood_type: bloodType,
          max_results: 10
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Server failed to process request");
      }

      const data = await response.json();

      if (data.matches.length === 0) {
        setState({ status: "empty", stats: data.filter_stats });
      } else {
        setState({ status: "success", data });
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setState({ status: "error", message: "Matching process timed out (15s). Please try again." });
      } else {
        setState({ status: "error", message: err.message || "An unexpected error occurred." });
      }
    }
  };

  return { state, findMatches };
}
