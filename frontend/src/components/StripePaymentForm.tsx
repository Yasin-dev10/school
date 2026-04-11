"use client";
import React, { useState } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StripePaymentFormProps {
    invoice: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function StripePaymentForm({ 
    invoice, 
    onSuccess, 
    onCancel 
}: StripePaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);
        setMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard/student-finance?payment=success&invoice=${invoice.id}`,
            },
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || 'An error occurred');
                toast.error(error.message || 'Payment failed');
            } else {
                setMessage("An unexpected error occurred.");
                toast.error('An unexpected error occurred');
            }
        } else {
            // Payment succeeded
            toast.success('Payment successful!');
            onSuccess();
        }

        setIsLoading(false);
    };

    const paymentElementOptions = {
        layout: "tabs" as const,
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Complete Payment
                    </h3>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Invoice:</span>
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="font-medium">${invoice.totalAmount}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Paid Amount:</span>
                        <span className="font-medium">${invoice.paidAmount}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-semibold text-gray-900">Outstanding:</span>
                        <span className="font-bold text-lg text-blue-600">
                            ${invoice.outstandingAmount}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <PaymentElement 
                    id="payment-element" 
                    options={paymentElementOptions}
                />
                
                {message && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{message}</p>
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !stripe || !elements}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Pay $${invoice.outstandingAmount}`
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}