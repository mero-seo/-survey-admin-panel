"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await apiClient.post("/api/v1/auth/forgot-password", values);
      setIsSuccess(true);
      toast.success("Password reset link sent. Please check your email.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to send reset link.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {isSuccess
              ? "Check your email for the reset link."
              : "Enter your email to receive a password reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center">
              <p className="mb-4">
                If you don&apos;t see the email, please check your spam folder.
              </p>
              <Button asChild>
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/login">Go back to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 