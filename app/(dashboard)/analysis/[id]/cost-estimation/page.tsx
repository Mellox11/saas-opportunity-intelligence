'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CostEstimator } from '../../new/components/CostEstimator'
import { CostBreakdown } from '../../new/components/CostBreakdown'
import { BudgetSelector } from '../../new/components/BudgetSelector'
import { CostApprovalModal } from '../../new/components/CostApprovalModal'
import { ConfigurationPreview } from '../../new/components/ConfigurationPreview'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export default function CostEstimationPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [configuration, setConfiguration] = useState<any>(null)
  const [budget, setBudget] = useState(10)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [costBreakdown, setCostBreakdown] = useState<any>(null)
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load analysis configuration
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis/${analysisId}`)
        if (!response.ok) {
          throw new Error('Failed to load analysis')
        }
        const data = await response.json()
        setConfiguration(JSON.parse(data.configuration))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalysis()
  }, [analysisId])

  const handleApprove = async () => {
    setShowApprovalModal(true)
  }

  const handleConfirmApproval = async () => {
    try {
      const response = await fetch('/api/approve-analysis-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          estimatedCost,
          budgetLimit: budget
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve cost')
      }

      // Redirect to analysis execution page
      router.push(`/analysis/${analysisId}/execute`)
    } catch (err: any) {
      setError(err.message)
      throw err // Re-throw to let modal handle the error
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading cost estimation...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  const isOverBudget = estimatedCost > budget

  return (
    <div className="min-h-screen bg-gray-950 dot-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Configuration
            </Button>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Cost Estimation & Budget
            </h1>
            <p className="text-gray-400">
              Review estimated costs and set your budget before starting the analysis
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Cost Estimation */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Estimated Costs</CardTitle>
                  <CardDescription>
                    Based on your configuration parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CostEstimator
                    configuration={configuration}
                    onCostUpdate={(estimate) => {
                      if (estimate) {
                        setCostEstimate(estimate)
                        setEstimatedCost(estimate.finalPrice)
                        setCostBreakdown(estimate.breakdown)
                      }
                    }}
                  />
                  {costBreakdown && (
                    <div className="mt-6">
                      <CostBreakdown
                        breakdown={costBreakdown}
                        finalPrice={estimatedCost}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Budget Selection */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Set Your Budget</CardTitle>
                  <CardDescription>
                    Maximum amount you&rsquo;re willing to spend on this analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetSelector
                    value={budget}
                    onChange={setBudget}
                    estimatedCost={estimatedCost}
                  />
                  
                  {isOverBudget && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 font-medium">
                            Estimated cost exceeds budget
                          </p>
                          <p className="text-red-400/80 text-sm mt-1">
                            The estimated cost (${estimatedCost.toFixed(2)}) is higher than your 
                            budget (${budget.toFixed(2)}). Consider adjusting your configuration 
                            or increasing your budget.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Configuration Preview & Actions */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <ConfigurationPreview
                  configuration={configuration}
                  className="mb-6"
                />

                <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Estimated Cost:</span>
                      <span className="text-white font-medium">
                        ${estimatedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Your Budget:</span>
                      <span className={isOverBudget ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                        ${budget.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <Button
                        onClick={handleApprove}
                        disabled={isOverBudget}
                        className="w-full"
                        size="lg"
                      >
                        Approve & Continue
                      </Button>
                      {isOverBudget && (
                        <p className="text-xs text-red-400 text-center mt-2">
                          Cannot proceed: cost exceeds budget
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Approval Modal */}
      {showApprovalModal && costEstimate && (
        <CostApprovalModal
          open={showApprovalModal}
          onOpenChange={setShowApprovalModal}
          estimate={costEstimate}
          budgetLimit={budget}
          configuration={configuration}
          onApprove={handleConfirmApproval}
          onCancel={() => setShowApprovalModal(false)}
        />
      )}
    </div>
  )
}