(function () {
  "use strict";

  const STORAGE_KEY = "javaGardenAdventure.v1";
  const RECOVERY_KEY = "javaGardenAdventure.recovery";
  const SCHEMA_VERSION = 1;

  function freshState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: null,
      preferences: {
        energy: "low",
        duration: "none",
        reducedMotion: false
      },
      topicAssessments: {},
      questProgress: {},
      totalXP: 0,
      activeQuestId: null,
      mostRecentCompletedQuestId: null,
      createdAt: new Date().toISOString(),
      lastSavedAt: null
    };
  }

  function canUseLocalStorage() {
    try {
      const probe = `${STORAGE_KEY}.probe`;
      window.localStorage.setItem(probe, "ok");
      window.localStorage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeObject(value, fallback) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : fallback;
  }

  function normalizeState(value) {
    if (!value || value.schemaVersion !== SCHEMA_VERSION) {
      throw new Error("Unsupported or missing save version.");
    }

    const defaults = freshState();
    const preferences = safeObject(value.preferences, {});
    const topicAssessments = safeObject(value.topicAssessments, {});
    const questProgress = safeObject(value.questProgress, {});
    const loadedProfile = value.profile === null
      ? null
      : safeObject(value.profile, null);
    const profile = loadedProfile
      ? {
          ...loadedProfile,
          mascot: "tintinsito-dog"
        }
      : null;

    return {
      ...defaults,
      profile,
      preferences: {
        energy: ["low", "medium", "high", "surprise"].includes(preferences.energy)
          ? preferences.energy
          : defaults.preferences.energy,
        duration: ["none", "10", "20", "30", "45"].includes(String(preferences.duration))
          ? String(preferences.duration)
          : defaults.preferences.duration,
        reducedMotion: Boolean(preferences.reducedMotion)
      },
      topicAssessments,
      questProgress,
      totalXP: Number.isFinite(Number(value.totalXP))
        ? Math.max(0, Number(value.totalXP))
        : 0,
      activeQuestId: typeof value.activeQuestId === "string"
        ? value.activeQuestId
        : null,
      mostRecentCompletedQuestId:
        typeof value.mostRecentCompletedQuestId === "string"
          ? value.mostRecentCompletedQuestId
          : null,
      createdAt: typeof value.createdAt === "string"
        ? value.createdAt
        : defaults.createdAt,
      lastSavedAt: typeof value.lastSavedAt === "string"
        ? value.lastSavedAt
        : null
    };
  }

  function load() {
    const storageAvailable = canUseLocalStorage();
    if (!storageAvailable) {
      return {
        state: freshState(),
        storageAvailable: false,
        warning:
          "Progress cannot be saved in this browser right now. You can still explore, but changes will disappear when this tab closes."
      };
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        state: freshState(),
        storageAvailable: true,
        warning: ""
      };
    }

    try {
      return {
        state: normalizeState(JSON.parse(raw)),
        storageAvailable: true,
        warning: ""
      };
    } catch (error) {
      try {
        window.localStorage.setItem(RECOVERY_KEY, raw);
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (recoveryError) {
        // The original error is more helpful to the learner than a recovery failure.
      }

      return {
        state: freshState(),
        storageAvailable: true,
        warning:
          "Your previous progress could not be read, so the garden opened safely with a fresh view. A recovery copy remains in this browser."
      };
    }
  }

  function save(state) {
    state.lastSavedAt = new Date().toISOString();
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function reset() {
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return freshState();
  }

  window.JavaGardenStorage = {
    STORAGE_KEY,
    SCHEMA_VERSION,
    freshState,
    load,
    save,
    reset
  };
})();
