/**
 * Test script to verify Reddit data fetching improvements
 * This script tests fetching all posts from the startups subreddit for the last 30 days
 */

const { HybridRedditClient } = require('./lib/services/hybrid-reddit-client')
const { RedditClient } = require('./lib/services/reddit-client')

async function testRedditFetching() {
  console.log('🧪 Testing Reddit Data Fetching Improvements\n')
  console.log('=' .repeat(50))
  
  const testConfig = {
    subreddit: 'startups',
    timeRange: 30, // Last 30 days
    keywords: { predefined: [], custom: [] }, // No keywords = fetch ALL posts
  }
  
  console.log('📋 Test Configuration:')
  console.log(`  - Subreddit: r/${testConfig.subreddit}`)
  console.log(`  - Time Range: ${testConfig.timeRange} days`)
  console.log(`  - Keywords: None (fetching ALL posts)`)
  console.log('=' .repeat(50))
  
  try {
    // Test 1: Direct JSON API
    console.log('\n🌐 Test 1: JSON API Direct Fetch')
    console.log('-'.repeat(30))
    
    const jsonClient = new RedditClient()
    const startTime1 = Date.now()
    
    const jsonPosts = await jsonClient.collectPostsFromSubreddits(
      [testConfig.subreddit],
      testConfig.timeRange,
      testConfig.keywords,
      2000 // Max posts
    )
    
    const elapsed1 = ((Date.now() - startTime1) / 1000).toFixed(2)
    
    console.log(`✅ JSON API Results:`)
    console.log(`  - Posts collected: ${jsonPosts.length}`)
    console.log(`  - Time taken: ${elapsed1}s`)
    console.log(`  - Sample titles:`)
    jsonPosts.slice(0, 3).forEach((post, i) => {
      console.log(`    ${i + 1}. "${post.title.substring(0, 60)}..."`)
    })
    
    // Test 2: Hybrid Client (JSON + RSS fallback)
    console.log('\n🔄 Test 2: Hybrid Client (JSON with RSS fallback)')
    console.log('-'.repeat(30))
    
    const hybridClient = new HybridRedditClient()
    const startTime2 = Date.now()
    
    const hybridPosts = await hybridClient.collectPostsFromSubreddits(
      [testConfig.subreddit],
      testConfig.timeRange,
      testConfig.keywords,
      2000 // Max posts
    )
    
    const elapsed2 = ((Date.now() - startTime2) / 1000).toFixed(2)
    
    console.log(`✅ Hybrid Client Results:`)
    console.log(`  - Posts collected: ${hybridPosts.length}`)
    console.log(`  - Time taken: ${elapsed2}s`)
    
    // Analysis
    console.log('\n📊 Analysis Summary')
    console.log('=' .repeat(50))
    console.log(`🎯 GOAL: Fetch ALL posts from last ${testConfig.timeRange} days`)
    console.log(`📈 JSON API collected: ${jsonPosts.length} posts`)
    console.log(`📈 Hybrid client collected: ${hybridPosts.length} posts`)
    
    if (jsonPosts.length > 100 || hybridPosts.length > 100) {
      console.log('\n✅ SUCCESS: Now fetching significantly more posts!')
      console.log('   Previous issue (6 posts) has been resolved.')
    } else if (jsonPosts.length > 50 || hybridPosts.length > 50) {
      console.log('\n⚠️ PARTIAL SUCCESS: Fetching more posts but may not be complete.')
      console.log('   Check if Reddit API is rate limiting or blocking requests.')
    } else {
      console.log('\n❌ ISSUE PERSISTS: Still getting limited posts.')
      console.log('   Reddit API may be blocking or rate limiting.')
    }
    
    // Date range verification
    if (jsonPosts.length > 0) {
      const oldestPost = jsonPosts[jsonPosts.length - 1]
      const newestPost = jsonPosts[0]
      const daysCovered = Math.floor((new Date() - oldestPost.createdUtc) / (1000 * 60 * 60 * 24))
      
      console.log('\n📅 Date Range Coverage:')
      console.log(`  - Newest post: ${newestPost.createdUtc.toISOString()}`)
      console.log(`  - Oldest post: ${oldestPost.createdUtc.toISOString()}`)
      console.log(`  - Days covered: ${daysCovered} days`)
      
      if (daysCovered >= testConfig.timeRange - 1) {
        console.log(`  ✅ Full ${testConfig.timeRange}-day range covered`)
      } else {
        console.log(`  ⚠️ Only ${daysCovered} days covered (expected ${testConfig.timeRange})`)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:')
    console.error(error)
    console.error('\nThis might indicate:')
    console.error('  1. Reddit API is blocking requests')
    console.error('  2. Rate limiting is too aggressive')
    console.error('  3. Network connectivity issues')
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('🧪 Test Complete')
}

// Run the test
testRedditFetching().catch(console.error)