import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Button, { type ButtonProps } from '../ui/Button';
import { Copy, LogOut, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WalletMultiButtonProps extends ButtonProps {
    children?: React.ReactNode;
    disableMenu?: boolean;
}

export const WalletMultiButton = ({ className, children, disableMenu = false, ...props }: WalletMultiButtonProps) => {
    const { publicKey, wallet, disconnect, connect, connected, connecting } = useWallet();
    const { setVisible } = useWalletModal();
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const node = ref.current;
            if (!node || node.contains(event.target as Node)) return;
            setMenuOpen(false);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, []);

    const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);

    const content = useMemo(() => {
        if (children) return children;
        if (connecting) return 'Connecting...';
        if (connected && base58) return base58.slice(0, 4) + '..' + base58.slice(-4);
        if (wallet) return 'Connect';
        return 'Connect Wallet';
    }, [children, connecting, connected, base58, wallet]);

    const handleClick = () => {
        if (!wallet) {
            setVisible(true);
        } else if (!connected) {
            connect().catch(() => {});
        } else if (!disableMenu) {
            setMenuOpen(!menuOpen);
        }
    };

    const copyAddress = async () => {
        if (base58) {
            await navigator.clipboard.writeText(base58);
            setCopied(true);
            setTimeout(() => setCopied(false), 400);
            setMenuOpen(false);
        }
    };

    const changeWallet = () => {
        setVisible(true);
        setMenuOpen(false);
    };

    const handleDisconnect = () => {
        disconnect();
        setMenuOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <Button
                variant={connected ? "secondary" : "default"}
                className={cn("gap-2", className)}
                onClick={handleClick}
                {...props}
            >
                {wallet && wallet.adapter.icon ? (
                    <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="h-4 w-4" />
                ) : (
                    <Wallet className="h-4 w-4" />
                )}
                {content}
            </Button>
            
            {!disableMenu && menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95 z-50">
                    <div className="flex flex-col gap-1">
                        {connected && (
                            <button
                                onClick={copyAddress}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors text-popover-foreground"
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {copied ? 'Copied!' : 'Copy Address'}
                            </button>
                        )}
                        <button
                            onClick={changeWallet}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors text-popover-foreground"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Change Wallet
                        </button>
                        <button
                            onClick={handleDisconnect}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive hover:text-destructive-foreground transition-colors text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
