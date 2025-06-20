"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

// Animation Variants for Framer Motion
const cardVariants = {
  rest: { y: 0 },
  hover: { 
    y: -8,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  },
} as const;

const shapeVariants = {
  rest: { x: 0, y: 0, opacity: 0.7 },
  hover: {
    x: 5,
    y: -5,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20, duration: 0.4 },
  },
} as const;

const textVariants = {
    rest: { scale: 1 },
    hover: {
        scale: 1.05,
        transition: { type: 'spring', stiffness: 300 }
    }
} as const;

interface StatCardProps {
    title: string;
    value: string | number | undefined | null;
    icon: React.ReactNode;
    colors: string;
    textColor: string;
    percentage?: number;
    mainValueClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    colors,
    textColor,
    percentage,
    mainValueClass = 'text-2xl',
}) => {
    return (
        <motion.div
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            animate="rest"
            className="h-full"
        >
            <Card className={`shadow-sm border-0 bg-gradient-to-br ${colors} relative overflow-hidden h-full`}>
                <motion.div variants={shapeVariants} className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
                <motion.div variants={shapeVariants} className="absolute top-4 -left-4 w-20 h-20 bg-white/10 rounded-lg rotate-12" />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {icon} {title}
                    </CardTitle>
                    {percentage !== undefined && <span className={`${textColor} font-bold`}>{percentage}%</span>}
                </CardHeader>
                <CardContent className="relative z-10">
                    <motion.div variants={textVariants} className={`font-bold ${textColor} ${mainValueClass}`}>
                        {value ?? 'N/A'}
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}; 