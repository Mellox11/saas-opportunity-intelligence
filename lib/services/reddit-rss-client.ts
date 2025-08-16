import { ProcessedRedditPost } from '@/lib/validation/reddit-schema'

export class RedditRSSClient {
  private readonly baseUrl = 'https://www.reddit.com'
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

  constructor(private analysisId?: string) {}

  /**
   * Fetch Reddit posts using RSS feed (more accessible than JSON API)
   */
  async fetchPostsViaRSS(
    subreddit: string,
    limit: number = 100 // Increased default limit
  ): Promise<{ posts: ProcessedRedditPost[], after: string | null }> {
    try {
      // Use Reddit RSS feed with max limit (RSS supports up to 100)
      const url = `${this.baseUrl}/r/${subreddit}/new.rss?limit=${Math.min(limit, 100)}`
      
      console.log(`📡 Fetching from RSS: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RedditRSSReader/1.0 (compatible; analysis bot)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      })
      
      console.log(`📡 RSS Response Status: ${response.status} ${response.statusText}`)
      console.log(`📡 RSS Response Headers:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ RSS Error Response Body:`, errorText.substring(0, 500))
        throw new Error(`Reddit RSS error: ${response.status} ${response.statusText}`)
      }
      
      const xmlText = await response.text()
      console.log(`✅ RSS response received (${xmlText.length} chars), parsing XML...`)
      console.log(`📄 RSS XML Preview:`, xmlText.substring(0, 500))
      
      // Parse RSS XML to extract posts
      const posts = this.parseRSSFeed(xmlText, subreddit)
      
      console.log(`✅ Parsed ${posts.length} posts from RSS feed`)
      
      return {
        posts,
        after: null // RSS doesn't provide pagination tokens
      }
      
    } catch (error) {
      console.error(`❌ RSS fetch failed for r/${subreddit}:`, error)
      throw error
    }
  }

  /**
   * Parse RSS/Atom XML and convert to our post format
   */
  private parseRSSFeed(xmlText: string, subreddit: string): ProcessedRedditPost[] {
    const posts: ProcessedRedditPost[] = []
    
    try {
      // Reddit returns Atom feed, so look for <entry> elements instead of <item>
      const entryMatches = xmlText.match(/<entry[^>]*>[\s\S]*?<\/entry>/g)
      
      if (!entryMatches) {
        console.warn('No Atom entries found in feed')
        return posts
      }
      
      console.log(`📄 Found ${entryMatches.length} Atom entries to parse`)
      
      for (let i = 0; i < entryMatches.length; i++) {
        try {
          console.log(`📄 Parsing entry ${i + 1}/${entryMatches.length}`)
          const post = this.parseAtomEntry(entryMatches[i], subreddit)
          if (post) {
            console.log(`✅ Successfully parsed post: "${post.title}" (score: ${post.score})`)
            posts.push(post)
          } else {
            console.warn(`❌ Entry ${i + 1} parsed but returned null`)
          }
        } catch (error) {
          console.warn(`❌ Failed to parse Atom entry ${i + 1}:`, error)
          // Continue with other entries
        }
      }
      
    } catch (error) {
      console.error('Atom parsing failed:', error)
    }
    
    return posts
  }

  /**
   * Parse individual Atom entry
   */
  private parseAtomEntry(entryXml: string, subreddit: string): ProcessedRedditPost | null {
    try {
      // Extract basic fields using regex (simple approach for Atom)
      const title = this.extractXMLContent(entryXml, 'title')
      const link = this.extractXMLAttribute(entryXml, 'link', 'href')
      const content = this.extractXMLContent(entryXml, 'content')
      const published = this.extractXMLContent(entryXml, 'published')
      const id = this.extractXMLContent(entryXml, 'id')
      const authorName = this.extractXMLContent(entryXml, 'name') || 'unknown'
      
      if (!title || !link) {
        return null
      }
      
      // Extract Reddit ID from link or id
      let redditId = id.replace('t3_', '') || `atom-${Date.now()}-${Math.random()}`
      const linkIdMatch = link.match(/\/comments\/([a-z0-9]+)\//)
      if (linkIdMatch) {
        redditId = linkIdMatch[1]
      }
      
      // Clean up content (remove HTML tags)
      const cleanContent = content ? this.stripHtml(content) : ''
      
      // Parse date
      const createdUtc = published ? new Date(published) : new Date()
      
      return {
        analysisId: this.analysisId || '',
        redditId,
        subreddit,
        title: this.stripHtml(title),
        content: cleanContent.length > 0 ? cleanContent : null,
        author: this.stripHtml(authorName),
        score: 0, // Atom doesn't provide scores
        numComments: 0, // Atom doesn't provide comment counts
        createdUtc,
        url: link,
        permalink: link,
        rawData: { atomEntry: entryXml },
        matchedKeywords: [],
        processed: false
      }
      
    } catch (error) {
      console.error('Failed to parse Atom entry:', error)
      return null
    }
  }

  /**
   * Extract content from XML tags
   */
  private extractXMLContent(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : ''
  }

  /**
   * Extract attribute from XML tags
   */
  private extractXMLAttribute(xml: string, tagName: string, attributeName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*${attributeName}=["']([^"']*?)["'][^>]*`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : ''
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim()
  }

  /**
   * Filter posts by keywords (same as JSON client)
   */
  filterPostsByKeywords(
    posts: ProcessedRedditPost[],
    keywords: { predefined: string[], custom: string[] }
  ): ProcessedRedditPost[] {
    const allKeywords = [...keywords.predefined, ...keywords.custom]
      .map(k => k.toLowerCase())
    
    if (allKeywords.length === 0) {
      return posts
    }
    
    return posts.filter(post => {
      const textToSearch = `${post.title} ${post.content || ''}`.toLowerCase()
      const matchedKeywords: string[] = []
      
      for (const keyword of allKeywords) {
        if (textToSearch.includes(keyword)) {
          matchedKeywords.push(keyword)
        }
      }
      
      if (matchedKeywords.length > 0) {
        post.matchedKeywords = matchedKeywords
        return true
      }
      
      return false
    })
  }
}