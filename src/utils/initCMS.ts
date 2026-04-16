import CMSContent from '../models/CMSContent';

/**
 * Initializes essential CMS content blocks if they don't exist.
 */
export const initializeCMS = async () => {
  try {
    const essentialKeys = [
      {
        key: 'footer_socials',
        type: 'json',
        value: [
          { platform: 'Twitter', url: 'https://twitter.com/lootthread' },
          { platform: 'Discord', url: 'https://discord.gg/lootthread' },
          { platform: 'Instagram', url: 'https://instagram.com/lootthread' }
        ],
        isActive: true
      }
    ];

    for (const block of essentialKeys) {
      const exists = await CMSContent.findOne({ key: block.key });
      if (!exists) {
        console.log(`[CMS] Initializing default content for: ${block.key}`);
        await CMSContent.create(block);
      }
    }
  } catch (err) {
    console.error('[CMS] Failed to initialize default content:', err);
  }
};
