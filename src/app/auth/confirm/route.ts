import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/'

    if (token_hash && type) {
        const supabase = await createClient()

        // Verify OTP and create session
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Session is now created - redirect to password reset page
            const redirectTo = request.nextUrl.clone()
            redirectTo.pathname = next
            redirectTo.searchParams.delete('token_hash')
            redirectTo.searchParams.delete('type')
            return NextResponse.redirect(redirectTo)
        }
    }

    // Error handling
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = '/auth/auth-code-error'
    return NextResponse.redirect(redirectTo)
}
