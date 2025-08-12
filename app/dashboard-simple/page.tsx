import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SimpleDashboardPage() {
  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '20px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Epic 1 Dashboard</h1>
      <p style={{ marginBottom: '2rem' }}>Welcome to your SaaS Opportunity Intelligence dashboard</p>
      
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Total Analyses</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</div>
          <p>No analyses yet</p>
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Opportunities Found</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</div>
          <p>Start your first analysis</p>
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>Total Spent</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>$0.00</div>
          <p>No charges yet</p>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Epic 1 Features Available:</h3>
        <p>✅ User authentication & management</p>
        <p>✅ Reddit data collection & configuration</p>
        <p>✅ Cost estimation & budget approval</p>
        <p>✅ AI analysis pipeline with progress tracking</p>
        
        <div style={{ marginTop: '1rem' }}>
          <Link href="/analysis/new" style={{ 
            display: 'inline-block', 
            backgroundColor: '#0ea5e9', 
            color: 'white', 
            padding: '10px 20px', 
            textDecoration: 'none', 
            borderRadius: '5px',
            marginRight: '10px'
          }}>
            🚀 Start New Analysis
          </Link>
          <Link href="/test" style={{ 
            display: 'inline-block', 
            backgroundColor: '#6b7280', 
            color: 'white', 
            padding: '10px 20px', 
            textDecoration: 'none', 
            borderRadius: '5px'
          }}>
            📊 Test Page
          </Link>
        </div>
      </div>
    </div>
  )
}