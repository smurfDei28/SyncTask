import { Image, StyleSheet, View } from 'react-native';

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/synctask-logo.png')}
        accessibilityLabel="SyncTask"
        accessible
        resizeMode="contain"
        style={[styles.logo, large && styles.large]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  logo: { width: 280, maxWidth: '100%', aspectRatio: 1.5 },
  large: { width: 340 },
});
