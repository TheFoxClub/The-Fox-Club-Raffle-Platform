import { Activity, DollarSign, Trophy, Ticket } from "lucide-react";

export interface XPSourceConfig {
  label: string;
  icon: any;
  singularActivity: string;
  pluralActivity: string;
  singularRecord: string;
  pluralRecord: string;
  description: string;
}

export const XP_SOURCE_CONFIG: Record<string, XPSourceConfig> = {
  // New config keys
  raffle_creation_reward: {
    label: "Raffle Creation",
    icon: Trophy,
    singularActivity: "raffle creation",
    pluralActivity: "raffle creations",
    singularRecord: "raffle",
    pluralRecord: "raffles",
    description: "XP earned from creating new raffles"
  },
  ticket_purchase_reward: {
    label: "Ticket Purchases",
    icon: Ticket,
    singularActivity: "ticket purchase",
    pluralActivity: "ticket purchases", 
    singularRecord: "purchase",
    pluralRecord: "purchases",
    description: "XP earned from buying raffle tickets"
  },
  ticket_purchase_rate: {
    label: "Ticket Purchases",
    icon: Ticket,
    singularActivity: "ticket purchase",
    pluralActivity: "ticket purchases", 
    singularRecord: "purchase",
    pluralRecord: "purchases",
    description: "XP earned from buying raffle tickets"
  },
  raffle_revenue_reward: {
    label: "Raffle Revenue",
    icon: DollarSign,
    singularActivity: "revenue earning",
    pluralActivity: "revenue earnings",
    singularRecord: "revenue record", 
    pluralRecord: "revenue records",
    description: "XP earned from raffle ticket sales revenue"
  },
  raffle_revenue_rate: {
    label: "Raffle Revenue",
    icon: DollarSign,
    singularActivity: "revenue earning",
    pluralActivity: "revenue earnings",
    singularRecord: "revenue record", 
    pluralRecord: "revenue records",
    description: "XP earned from raffle ticket sales revenue"
  },
  // Legacy sourceType values for backward compatibility
  ticket_purchase: {
    label: "Ticket Purchases",
    icon: Ticket,
    singularActivity: "ticket purchase",
    pluralActivity: "ticket purchases", 
    singularRecord: "purchase",
    pluralRecord: "purchases",
    description: "XP earned from buying raffle tickets"
  },
  raffle_revenue: {
    label: "Raffle Revenue",
    icon: DollarSign,
    singularActivity: "revenue earning",
    pluralActivity: "revenue earnings",
    singularRecord: "revenue record", 
    pluralRecord: "revenue records",
    description: "XP earned from raffle ticket sales revenue"
  },
  raffle_creation: {
    label: "Raffle Creation", 
    icon: Trophy,
    singularActivity: "raffle creation",
    pluralActivity: "raffle creations",
    singularRecord: "raffle",
    pluralRecord: "raffles",
    description: "XP earned from creating new raffles"
  }
};

// Helper function to get activity label
export function getActivityLabel(sourceType: string, count: number): string {
  const config = XP_SOURCE_CONFIG[sourceType];
  if (!config) return count === 1 ? 'activity' : 'activities';
  
  return count === 1 ? config.singularActivity : config.pluralActivity;
}

// Helper function to get record label  
export function getRecordLabel(sourceType: string, count: number): string {
  const config = XP_SOURCE_CONFIG[sourceType];
  if (!config) return count === 1 ? 'record' : 'records';
  
  return count === 1 ? config.singularRecord : config.pluralRecord;
}

// Helper function to get source config
export function getSourceConfig(sourceType: string): XPSourceConfig {
  return XP_SOURCE_CONFIG[sourceType] || {
    label: sourceType,
    icon: Activity,
    singularActivity: 'activity',
    pluralActivity: 'activities',
    singularRecord: 'record',
    pluralRecord: 'records', 
    description: 'XP earned from various activities'
  };
}