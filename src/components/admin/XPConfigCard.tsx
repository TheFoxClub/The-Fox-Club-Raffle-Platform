import { useState } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

interface XPConfig {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
  isActive: boolean;
}

interface XPConfigCardProps {
  config: XPConfig[];
  onConfigUpdate: (configKey: string, configValue: number, description?: string) => Promise<void>;
  loading: boolean;
}

const CONFIG_LABELS = {
  ticket_purchase_rate: "Ticket Purchase Rate",
  raffle_revenue_rate: "Raffle Revenue Rate", 
  raffle_creation_reward: "Raffle Creation Reward"
};

const CONFIG_DESCRIPTIONS = {
  ticket_purchase_rate: "XP earned per $1 spent on tickets",
  raffle_revenue_rate: "XP earned per $1 of raffle revenue",
  raffle_creation_reward: "Fixed XP reward for creating a raffle"
};

export function XPConfigCard({ config, onConfigUpdate, loading }: XPConfigCardProps) {
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleInputChange = (configKey: string, value: string) => {
    setEditingConfig(prev => ({
      ...prev,
      [configKey]: value
    }));
  };

  const handleSave = async (configItem: XPConfig) => {
    const newValue = editingConfig[configItem.configKey];
    if (newValue === undefined) return;

    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue) || numericValue < 0) {
      return;
    }

    setSaving(prev => ({ ...prev, [configItem.configKey]: true }));
    
    try {
      await onConfigUpdate(
        configItem.configKey, 
        numericValue, 
        configItem.description
      );
      
      // Clear editing state on success
      setEditingConfig(prev => {
        const newState = { ...prev };
        delete newState[configItem.configKey];
        return newState;
      });
    } finally {
      setSaving(prev => ({ ...prev, [configItem.configKey]: false }));
    }
  };

  const handleReset = (configKey: string) => {
    setEditingConfig(prev => {
      const newState = { ...prev };
      delete newState[configKey];
      return newState;
    });
  };

  const getCurrentValue = (configItem: XPConfig) => {
    return editingConfig[configItem.configKey] !== undefined 
      ? editingConfig[configItem.configKey]
      : configItem.configValue;
  };

  const hasChanges = (configKey: string) => {
    return editingConfig[configKey] !== undefined;
  };

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">XP Configuration</h3>
      </div>

      <div className="space-y-6">
        {config.map((configItem) => (
          <div key={configItem.configKey} className="space-y-3">
            <div>
              <Label className="text-sm font-medium">
                {CONFIG_LABELS[configItem.configKey as keyof typeof CONFIG_LABELS] || configItem.configKey}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {CONFIG_DESCRIPTIONS[configItem.configKey as keyof typeof CONFIG_DESCRIPTIONS] || configItem.description}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={getCurrentValue(configItem)}
                  onChange={(e) => handleInputChange(configItem.configKey, e.target.value)}
                  className="text-sm"
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center gap-1">
                {hasChanges(configItem.configKey) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(configItem.configKey)}
                      disabled={saving[configItem.configKey]}
                      className="text-xs px-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSave(configItem)}
                      disabled={saving[configItem.configKey]}
                      className="text-xs px-2"
                    >
                      {saving[configItem.configKey] ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {config.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No XP configuration found</p>
        </div>
      )}
    </div>
  );
}