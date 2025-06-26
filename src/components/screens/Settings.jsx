import React from "react";
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from "react-native";

function Settings() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>App Preferences</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#333333',
    },
    content: {
        flex: 1,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666666',
        marginBottom: 12,
    }
});

export default Settings;
