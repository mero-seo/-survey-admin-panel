import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/50">
      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
      
      <Card className="mx-auto w-full max-w-md border-0 shadow-lg sm:border sm:shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Welcome to सर्वेक्षण फारम
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your comprehensive survey management system
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Manage surveys, track responses, and monitor devices all in one place. 
            Get started by accessing the admin panel.
          </p>
          
          <Button asChild size="lg" className="w-full">
            <Link href="/login">
              Access Admin Panel
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
