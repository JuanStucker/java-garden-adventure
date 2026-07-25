(function () {
  "use strict";

  const VALID_PROGRESS_STATES = new Set([
    "in-progress",
    "stuck",
    "completed",
    "skipped"
  ]);

  function statusFor(quest, state) {
    const saved = state.questProgress[quest.id];
    if (saved && VALID_PROGRESS_STATES.has(saved.status)) {
      return saved.status;
    }

    const unlocked = quest.prerequisites.every((questId) => {
      const prerequisite = state.questProgress[questId];
      return prerequisite && prerequisite.status === "completed";
    });

    return unlocked ? "available" : "locked";
  }

  function eligibleQuests(quests, state) {
    return quests.filter((quest) => {
      const status = statusFor(quest, state);
      return ["available", "in-progress", "stuck"].includes(status);
    });
  }

  function scoreQuest(quest, state, preferences, previousType) {
    const progress = state.questProgress[quest.id] || {};
    const status = statusFor(quest, state);
    let score = 0;

    if (state.activeQuestId === quest.id) score += 100;
    if (preferences.energy !== "surprise" && quest.energy === preferences.energy) {
      score += 40;
    }

    if (preferences.duration !== "none") {
      const selectedMinutes = Number(preferences.duration);
      if (quest.estimatedMinutes <= selectedMinutes) {
        score += 30;
      } else {
        score -= 30;
      }
    }

    if (status === "stuck") score += 25;
    if (
      Number.isFinite(progress.confidenceAfter) &&
      progress.confidenceAfter <= 1
    ) {
      score += 20;
    }
    if (
      state.mostRecentCompletedQuestId &&
      quest.prerequisites.includes(state.mostRecentCompletedQuestId)
    ) {
      score += 15;
    }
    if (previousType && quest.type !== previousType) score += 10;

    // Earlier course content wins close ties without overwhelming energy/time fit.
    score -= (quest.worldOrder * 0.1) + (quest.order * 0.01);
    return score;
  }

  function recommend(quests, state, preferences, offset) {
    const candidates = eligibleQuests(quests, state);
    const previousQuest = quests.find(
      (quest) => quest.id === state.mostRecentCompletedQuestId
    );
    const previousType = previousQuest ? previousQuest.type : null;
    const ranked = candidates
      .map((quest) => ({
        quest,
        status: statusFor(quest, state),
        score: scoreQuest(quest, state, preferences, previousType)
      }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.quest.worldOrder !== right.quest.worldOrder) {
          return left.quest.worldOrder - right.quest.worldOrder;
        }
        return left.quest.order - right.quest.order;
      });

    if (ranked.length <= 3) return ranked;

    const pinned = ranked.filter((item) => item.quest.id === state.activeQuestId);
    const rest = ranked.filter((item) => item.quest.id !== state.activeQuestId);
    const rotation = Math.max(0, Number(offset) || 0) % rest.length;
    const rotated = rest.slice(rotation).concat(rest.slice(0, rotation));
    const result = pinned.concat(rotated).slice(0, 3);

    const hasLowPressure = result.some(
      (item) =>
        item.quest.energy === "low" ||
        item.quest.estimatedMinutes <= 15
    );
    if (!hasLowPressure) {
      const gentleOption = ranked.find(
        (item) =>
          !result.includes(item) &&
          (item.quest.energy === "low" || item.quest.estimatedMinutes <= 15)
      );
      if (gentleOption) result[result.length - 1] = gentleOption;
    }

    return result;
  }

  window.JavaGardenRecommendations = {
    statusFor,
    eligibleQuests,
    scoreQuest,
    recommend
  };
})();
