import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Ticket, Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'new_ticket' | 'ticket_reply';
  subject: string;
  customerName: string;
  priority?: string;
  ticketId: string;
  createdAt: string;
  content?: string;
}

export function SupportTicketNotificationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/chime-alert.wav');
    audioRef.current.volume = 0.5;
    audioRef.current.addEventListener('canplaythrough', () => {
      setIsAudioReady(true);
    });
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current && isAudioReady) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
      });
    }
  };

  // Subscribe to new support tickets
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up realtime subscription for user:', user.id);

    // Listen for new tickets
    const ticketsChannel = supabase
      .channel('admin-new-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTicket = payload.new as any;
          console.log('New support ticket received:', newTicket);
          
          const notification: Notification = {
            id: `ticket-${newTicket.id}`,
            type: 'new_ticket',
            subject: newTicket.subject,
            customerName: newTicket.customer_name,
            priority: newTicket.priority,
            ticketId: newTicket.id,
            createdAt: newTicket.created_at,
          };
          
          setNotifications(prev => [notification, ...prev].slice(0, 5));
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('Tickets channel status:', status);
      });

    // Listen for new ticket messages (customer replies)
    const messagesChannel = supabase
      .channel('admin-ticket-replies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          console.log('New ticket message received:', newMessage);
          
          // Only notify for customer messages
          if (newMessage.sender_type !== 'customer') {
            console.log('Ignoring non-customer message');
            return;
          }
          
          // Fetch the ticket to check if it belongs to this admin
          const { data: ticket, error } = await supabase
            .from('support_tickets')
            .select('id, subject, customer_name, priority, user_id')
            .eq('id', newMessage.ticket_id)
            .single();
          
          if (error) {
            console.error('Error fetching ticket:', error);
            return;
          }
          
          if (ticket.user_id !== user.id) {
            console.log('Ticket does not belong to this user');
            return;
          }
          
          const notification: Notification = {
            id: `message-${newMessage.id}`,
            type: 'ticket_reply',
            subject: ticket.subject,
            customerName: ticket.customer_name,
            priority: ticket.priority,
            ticketId: ticket.id,
            createdAt: newMessage.created_at,
            content: newMessage.content?.substring(0, 100),
          };
          
          setNotifications(prev => [notification, ...prev].slice(0, 5));
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('Messages channel status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user?.id, isAudioReady]);

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const dismissAll = () => {
    setNotifications([]);
  };

  const viewTicket = (ticketId: string) => {
    navigate(`/support-tickets?ticket=${ticketId}`);
    dismissNotification(notifications.find(n => n.ticketId === ticketId)?.id || '');
  };

  const getPriorityStyles = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5';
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto border-l-4 rounded-lg shadow-lg border bg-card animate-in slide-in-from-top-5 duration-300"
            style={{ 
              animationDelay: `${index * 100}ms`,
              borderLeftColor: notification.priority?.toLowerCase() === 'urgent' ? 'rgb(239 68 68)' : 
                               notification.priority?.toLowerCase() === 'high' ? 'rgb(249 115 22)' : 
                               notification.priority?.toLowerCase() === 'medium' ? 'rgb(234 179 8)' : 'rgb(59 130 246)',
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 p-2 rounded-full ${notification.type === 'new_ticket' ? 'bg-primary/10' : 'bg-blue-500/10'}`}>
                    {notification.type === 'new_ticket' ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {notification.type === 'new_ticket' ? 'New Support Ticket' : 'Customer Reply'}
                      </span>
                      {notification.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityBadge(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{notification.subject}</p>
                    {notification.type === 'ticket_reply' && notification.content && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        "{notification.content}..."
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From: {notification.customerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewTicket(notification.ticketId)}
                    className="text-xs h-7"
                  >
                    <Ticket className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {notifications.length > 1 && (
          <div className="pointer-events-auto flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={dismissAll}
              className="text-xs shadow-md bg-card border"
            >
              Dismiss All ({notifications.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
