/**
 * Message Reaction Validator Utility
 * Handles validation, sanitization, and management of emoji reactions
 */

// Allowed emoji reactions for the platform
const ALLOWED_REACTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯',
  '👏', '🙌', '😍', '😎', '🤔', '🤷', '😅', '💪',
  '🎉', '🚀', '✨', '👌', '🙏', '😤', '🤢', '🤮',
  '🥳', '😱', '🤯', '😈', '🤡', '🎭', '😸', '😹',
  '😺', '😸', '😼', '😽', '🙀', '😿', '😾', '🙈',
  '🙉', '🙊', '💋', '💏', '💑', '👨‍👩‍👧‍👦'
];

/**
 * Validates if an emoji is allowed for reactions
 * @param {string} emoji - The emoji to validate
 * @returns {boolean} - True if emoji is allowed
 */
exports.isValidReaction = (emoji) => {
  return ALLOWED_REACTIONS.includes(emoji);
};

/**
 * Gets all allowed reactions
 * @returns {array} - Array of allowed emoji reactions
 */
exports.getAllowedReactions = () => {
  return ALLOWED_REACTIONS;
};

/**
 * Validates and sanitizes reaction input
 * @param {string} emoji - The emoji to validate
 * @returns {object} - { valid: boolean, error?: string, emoji?: string }
 */
exports.validateReaction = (emoji) => {
  // Check if emoji exists and is a string
  if (!emoji || typeof emoji !== 'string') {
    return {
      valid: false,
      error: 'Emoji must be a non-empty string'
    };
  }

  // Check if emoji is allowed
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    return {
      valid: false,
      error: `Invalid emoji. Allowed reactions: ${ALLOWED_REACTIONS.join(' ')}`
    };
  }

  return {
    valid: true,
    emoji
  };
};

/**
 * Gets reaction statistics from message reactions array
 * @param {array} reactions - Array of reaction objects from message
 * @returns {object} - Reaction statistics
 */
exports.getReactionStats = (reactions = []) => {
  if (!Array.isArray(reactions) || reactions.length === 0) {
    return {
      totalReactions: 0,
      totalUniqueEmojis: 0,
      reactionBreakdown: {}
    };
  }

  const breakdown = {};
  let total = 0;

  reactions.forEach(reaction => {
    if (reaction.emoji) {
      breakdown[reaction.emoji] = reaction.count || 0;
      total += reaction.count || 0;
    }
  });

  return {
    totalReactions: total,
    totalUniqueEmojis: reactions.length,
    reactionBreakdown: breakdown,
    topReactions: reactions
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map(r => ({ emoji: r.emoji, count: r.count }))
  };
};

/**
 * Checks if a user has reacted with a specific emoji
 * @param {array} reactions - Array of reaction objects
 * @param {string} emoji - The emoji to check
 * @param {string} userId - The user ID to check
 * @returns {boolean} - True if user has reacted with that emoji
 */
exports.hasUserReacted = (reactions = [], emoji, userId) => {
  const reaction = reactions.find(r => r.emoji === emoji);
  if (!reaction || !reaction.users) return false;
  
  return reaction.users.some(user => 
    user._id?.toString() === userId || user.toString() === userId
  );
};

/**
 * Gets all users who reacted with a specific emoji
 * @param {array} reactions - Array of reaction objects
 * @param {string} emoji - The emoji to get users for
 * @returns {array} - Array of user objects/IDs
 */
exports.getReactionUsers = (reactions = [], emoji) => {
  const reaction = reactions.find(r => r.emoji === emoji);
  return reaction?.users || [];
};

/**
 * Formats reactions for client response
 * @param {array} reactions - Array of reaction objects from message
 * @returns {array} - Formatted reaction data for API response
 */
exports.formatReactionsForResponse = (reactions = []) => {
  return reactions.map(reaction => ({
    emoji: reaction.emoji,
    count: reaction.count || 0,
    users: (reaction.users || []).map(user => ({
      id: user._id || user,
      fullName: user.fullName,
      photo: user.photo
    }))
  }));
};

/**
 * Cleans up reactions with zero count (for data maintenance)
 * @param {array} reactions - Array of reaction objects
 * @returns {array} - Cleaned reactions array
 */
exports.cleanupZeroReactions = (reactions = []) => {
  return reactions.filter(reaction => (reaction.count || 0) > 0);
};

module.exports = exports;
