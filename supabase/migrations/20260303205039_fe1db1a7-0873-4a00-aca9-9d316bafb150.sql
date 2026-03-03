
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sender can see their own messages (sent + drafts)
CREATE POLICY "Senders can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Senders can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Senders can update own drafts" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id AND is_draft = true);
CREATE POLICY "Senders can delete own drafts" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id AND is_draft = true);

-- Create message_recipients table for targeted delivery
CREATE TABLE public.message_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- Recipients can see messages targeted to them (only sent, not drafts)
CREATE POLICY "Recipients can view their messages" ON public.message_recipients FOR SELECT TO authenticated 
  USING (auth.uid() = recipient_id);
CREATE POLICY "Sender can manage recipients" ON public.message_recipients FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND sender_id = auth.uid()));
CREATE POLICY "Sender can delete recipients" ON public.message_recipients FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND sender_id = auth.uid()));

-- Allow recipients to also view the message content
CREATE POLICY "Recipients can read sent messages" ON public.messages FOR SELECT TO authenticated 
  USING (
    is_draft = false AND EXISTS (
      SELECT 1 FROM public.message_recipients 
      WHERE message_id = id AND recipient_id = auth.uid()
    )
  );

-- Recipients can update read_at
CREATE POLICY "Recipients can mark as read" ON public.message_recipients FOR UPDATE TO authenticated 
  USING (auth.uid() = recipient_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true);

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments');

-- Storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
