// Quick test script to verify Reddit API is working
const { RedditClient } = require('./lib/services/reddit-client.ts')

async function testRedditFetching() {
  console.log('🔍 Testing Reddit API connection...\n')
  
  // Create Reddit client (no auth needed for public data)
  const client = new RedditClient(undefined, true) // Skip cost tracking for test
  
  try {
    console.log('📡 Fetching posts from r/entrepreneur...')
    const result = await client.fetchPosts('entrepreneur', 7, 10) // Last 7 days, 10 posts
    
    console.log(`✅ Successfully fetched ${result.posts.length} posts!\n`)
    
    // Show first 3 posts as examples
    result.posts.slice(0, 3).forEach((post, i) => {
      console.log(`📄 Post ${i + 1}:`)
      console.log(`   Title: ${post.title}`)
      console.log(`   Score: ${post.score}`)
      console.log(`   Comments: ${post.numComments}`)
      console.log(`   Created: ${post.createdUtc.toLocaleDateString()}`)
      console.log(`   URL: ${post.permalink}`)
      console.log('')
    })
    
    // Test keyword filtering
    console.log('🔍 Testing keyword filtering...')
    const filtered = client.filterPostsByKeywords(result.posts, {
      predefined: ['problem', 'frustrating', 'need'],
      custom: ['tool', 'solution']
    })
    
    console.log(`🎯 Found ${filtered.length} posts matching pain point keywords`)
    
    if (filtered.length > 0) {
      console.log('\n📌 Example filtered post:')
      const example = filtered[0]
      console.log(`   Title: ${example.title}`)
      console.log(`   Matched keywords: ${example.matchedKeywords.join(', ')}`)
    }
    
  } catch (error) {
    console.error('❌ Reddit API test failed:', error.message)
  }
}

testRedditFetching()