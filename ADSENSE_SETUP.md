# AdSense Setup Guide for Community Observer

## Overview
This guide explains how to set up Google AdSense on the Community Observer website to monetize the site with contextual ads.

## Implementation Status
✅ **AdSlot component** - Updated to support AdSense ads  
✅ **Ad configuration** - Modified adSlots.json for AdSense integration  
✅ **JavaScript integration** - Created adsense.js for ad loading  
✅ **Layout integration** - Added AdSense script to main layout  

## Setup Steps

### 1. Google AdSense Account Setup
1. **Sign up** at [adsense.google.com](https://adsense.google.com)
2. **Add your website** - `https://thecommunityobserver.com`
3. **Wait for approval** (usually 1-2 weeks)
4. **Get your Publisher ID** (format: `ca-pub-XXXXXXXXXX`)

### 2. Configure AdSense Code
1. **Update publisher ID** in `/public/js/adsense.js`:
   ```javascript
   publisherId: 'ca-pub-XXXXXXXXXX', // Replace with your actual publisher ID
   ```

2. **Create ad units** in AdSense dashboard:
   - **Top Leaderboard** (728x90) - Responsive
   - **Sidebar Rectangle** (300x250) - Fixed size
   - **In-Article** (300x250) - Fixed size

3. **Get ad slot IDs** from AdSense and update in `/public/js/adsense.js`:
   ```javascript
   adSlots: {
     'top_leaderboard': {
       adSlot: 'YOUR_ACTUAL_AD_SLOT_ID', // Replace with real slot ID
       adFormat: 'auto',
       fullWidthResponsive: true
     },
     // ... other slots
   }
   ```

### 3. Current Ad Placement Strategy

#### **Ad Slots Enabled for AdSense:**
- **`top_leaderboard`** - News page, listing pages (728x90 responsive)
- **`sidebar_rect`** - Listing pages, articles (300x250)
- **`in_article`** - Article pages (300x250)

#### **Ad Slots Kept as Placeholders:**
- **`homepage_banner`** - Advertise page only (for newspaper examples)

### 4. Testing
1. **Deploy changes** to live site
2. **Check browser console** for AdSense loading messages
3. **Verify ad placeholders** are replaced with real ads
4. **Test on different pages** to ensure ads load properly

## AdSense Best Practices

### Content Guidelines
- ✅ **Local news content** - Perfect for contextual ads
- ✅ **Community-focused articles** - High engagement potential
- ✅ **Business/service content** - Relevant local advertisers

### Placement Guidelines
- ✅ **Above-the-fold** - Top leaderboard for maximum visibility
- ✅ **Sidebar placement** - Non-intrusive but visible
- ✅ **In-article** - Contextual placement within content

### Compliance
- ✅ **AdSense policies** - Follow Google's content policies
- ✅ **User experience** - Don't overwhelm with too many ads
- ✅ **Mobile optimization** - Ensure ads work on mobile devices

## Revenue Optimization

### Initial Setup
1. **Start with 3 ad units** (current implementation)
2. **Monitor performance** for first 30 days
3. **Analyze which placements** perform best

### Future Enhancements
- **Add more ad units** if performance is good
- **Implement A/B testing** for ad placement
- **Consider premium ad spots** for direct local advertisers

## Troubleshooting

### Common Issues
- **Ads not showing** - Check publisher ID and ad slot IDs
- **Console errors** - Verify AdSense script loading
- **Placeholder still visible** - Check ad unit configuration

### Debug Steps
1. **Check browser console** for JavaScript errors
2. **Verify AdSense account** is approved and active
3. **Test with AdSense test ads** first
4. **Check ad unit status** in AdSense dashboard

## Files Modified
- `src/components/AdSlot.astro` - Added AdSense support
- `src/data/adSlots.json` - Updated ad configurations
- `public/js/adsense.js` - Created AdSense integration script
- `src/layouts/Page.astro` - Added AdSense script loading

## Next Steps
1. **Get AdSense approval** and publisher ID
2. **Update configuration** with real ad slot IDs
3. **Deploy and test** on live site
4. **Monitor performance** and optimize placement
