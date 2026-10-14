import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chat, IMessage } from '@kesha-antonov/react-native-chat';
import { colors } from '@/constants/colors';
import { sharedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AssistantError, askAssistant, assistantSetupError } from '@/services/assistantService';

const ASSISTANT = { _id: 'assistant', name: 'Assistant' };

// Messages live in memory only: they are gone when the app reloads.
export default function AssistantScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const busy = useRef(false);
  const replyCount = useRef(0);

  const onSend = useCallback(async (incoming: IMessage[] = []) => {
    const question = incoming[0]?.text?.trim() ?? '';
    if (!question || busy.current) return;

    busy.current = true;
    setWaiting(true);
    setMessages(previous => Chat.append(previous, incoming));

    let answer: string;
    try {
      answer = await askAssistant(question);
    } catch (error) {
      answer = error instanceof AssistantError ? error.message : 'Something went wrong. Try again.';
    } finally {
      busy.current = false;
      setWaiting(false);
    }

    replyCount.current += 1;
    const reply: IMessage = {
      _id: `reply-${replyCount.current}`,
      text: answer,
      createdAt: new Date(),
      user: ASSISTANT,
    };
    setMessages(previous => Chat.append(previous, [reply]));
  }, []);

  const setupError = assistantSetupError();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={sharedStyles.title}>Assistant</Text>
        <Text style={sharedStyles.subtitle}>
          Ask about your projects and tasks. Messages are not saved.
        </Text>
        {setupError ? <Text style={styles.error}>{setupError}</Text> : null}
      </View>
      <View style={styles.chat}>
        <Chat
          messages={messages}
          onSend={onSend}
          user={{ _id: user?.id ?? 'me', name: user?.name }}
          isTyping={waiting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, gap: 4 },
  error: { color: colors.danger, marginTop: 8 },
  chat: { flex: 1 },
});
