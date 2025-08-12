'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CostBreakdown } from './CostBreakdown'
import { BudgetWarning } from '@/components/billing/BudgetWarning'
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  FileText,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/cost-calculator'
import { CostEstimateResponse } from '@/lib/validation/cost-schema'
import { cn } from '@/lib/utils'

interface CostApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estimate: CostEstimateResponse
  budgetLimit: number
  configuration: {
    subreddits: string[]
    timeRange: number
    keywords: {
      predefined: string[]
      custom: string[]
    }
  }
  onApprove: () => Promise<void>
  onCancel: () => void
}

export function CostApprovalModal({
  open,
  onOpenChange,
  estimate,
  budgetLimit,
  configuration,
  onApprove,
  onCancel
}: CostApprovalModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const isWithinBudget = estimate.finalPrice <= budgetLimit
  const canProceed = acknowledged && termsAccepted
  
  const handleApprove = async () => {
    if (!canProceed) return
    
    setIsApproving(true)
    setError(null)
    
    try {
      await onApprove()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to approve cost')
    } finally {
      setIsApproving(false)
    }
  }
  
  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
    // Reset state
    setAcknowledged(false)
    setTermsAccepted(false)
    setError(null)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Cost Approval Required
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Review and approve the estimated costs before starting your analysis
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Configuration Summary */}
          <div className="p-4 bg-gray-800/50 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Subreddits:</div>
              <div className="text-white">{configuration.subreddits.join(', ')}</div>
              
              <div className="text-gray-400">Time Range:</div>
              <div className="text-white">{configuration.timeRange} days</div>
              
              <div className="text-gray-400">Keywords:</div>
              <div className="text-white">
                {configuration.keywords.predefined.length + configuration.keywords.custom.length} selected
              </div>
            </div>
          </div>
          
          {/* Cost Breakdown */}
          <CostBreakdown
            breakdown={estimate.breakdown}
            finalPrice={estimate.finalPrice}
            showMarkup={true}
          />
          
          {/* Budget Warning */}
          {!isWithinBudget && (
            <BudgetWarning
              estimatedCost={estimate.finalPrice}
              budgetLimit={budgetLimit}
              show={true}
              variant="exceeded"
            />
          )}
          
          {/* Accuracy Notice */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-400">
              Cost estimation accuracy: {estimate.accuracy}%
              <br />
              <span className="text-xs opacity-80">
                Actual costs may vary by up to 25% from the estimate
              </span>
            </AlertDescription>
          </Alert>
          
          {/* Approval Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="acknowledge"
                className="text-sm text-gray-300 cursor-pointer select-none"
              >
                I understand that the estimated cost is{' '}
                <span className="font-semibold text-white">
                  {formatCurrency(estimate.finalPrice)}
                </span>
                {' '}and I approve this charge for the analysis
              </label>
            </div>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-300 cursor-pointer select-none"
              >
                I accept the usage-based billing terms and understand that:
                <ul className="mt-1 ml-4 text-xs text-gray-400 space-y-1">
                  <li>• I will only be charged for actual usage</li>
                  <li>• The analysis will stop if costs approach my budget limit</li>
                  <li>• No refunds are available once analysis begins</li>
                </ul>
              </label>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isApproving}
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!canProceed || isApproving}
            className={cn(
              'min-w-[120px]',
              canProceed
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Proceed
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}