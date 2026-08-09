import { useCallback, useEffect, useRef, useState } from "react";
import { groupApi } from "../services/groupApi";

/**
 * useGroupSync — polls group state every 3s (throttle-proof via setInterval).
 *
 * @param {string|null} groupCode  - Group code, or null if not in group mode
 * @param {string}      token      - JWT auth token
 * @param {string|null} localStage - The current local alarm stage (to broadcast to group)
 * @param {{lat,lng}|null} position - Current GPS position (to broadcast to group)
 *
 * @returns {{
 *   members: Array<{userId,displayName,lat,lng,isActive}>,
 *   groupAlarmStage: string|null,
 *   memberCount: number,
 *   isGroupActive: boolean,
 * }}
 */
export function useGroupSync(groupCode, token, localStage, position) {
  const [members, setMembers] = useState([]);
  const [groupAlarmStage, setGroupAlarmStage] = useState(null);
  const [isGroupActive, setIsGroupActive] = useState(false);

  const lastBroadcastStage = useRef(null);
  const lastPositionUpdate = useRef(0);
  const pollIntervalRef = useRef(null);

  const poll = useCallback(async () => {
    if (!groupCode || !token) return;
    try {
      const state = await groupApi.getState(token, groupCode);
      setMembers(state.members || []);
      setIsGroupActive(true);

      // If any group member triggered an alarm, update local state
      if (state.alarmStage && state.alarmStage !== groupAlarmStage) {
        setGroupAlarmStage(state.alarmStage);
      }
    } catch (e) {
      // Group expired or network error — don't crash
      console.warn("Group sync poll error:", e?.message);
    }
  }, [groupCode, token, groupAlarmStage]);

  // Broadcast GPS position every 5 seconds (less aggressive than poll)
  useEffect(() => {
    if (!groupCode || !token || !position?.lat) return;
    const now = Date.now();
    if (now - lastPositionUpdate.current < 5000) return;
    lastPositionUpdate.current = now;

    groupApi
      .updatePosition(token, groupCode, position.lat, position.lng)
      .catch(() => {});
  }, [groupCode, token, position?.lat, position?.lng]);

  // Broadcast alarm stage when it changes (only escalate)
  useEffect(() => {
    if (!groupCode || !token || !localStage) return;
    if (localStage === lastBroadcastStage.current) return;
    const alarmStages = ["stage1_1km", "stage2_500m", "stage3_100m", "critical", "arrived"];
    if (!alarmStages.includes(localStage)) return;

    lastBroadcastStage.current = localStage;
    groupApi.triggerAlarm(token, groupCode, localStage).catch(() => {});
  }, [groupCode, token, localStage]);

  // Start polling on mount, stop on unmount
  useEffect(() => {
    if (!groupCode || !token) return;

    // Poll immediately, then every 3 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [groupCode, token, poll]);

  return {
    members,
    groupAlarmStage,
    memberCount: members.length,
    isGroupActive,
  };
}
