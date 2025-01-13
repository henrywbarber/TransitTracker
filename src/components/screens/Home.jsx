import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';


function Home() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Favorites</Text>
            {/* Add Favorites List */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
});

export default Home;
