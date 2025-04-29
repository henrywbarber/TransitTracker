import React, {useState} from "react";
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Switch } from "react-native";

function Settings() {
    const [notifications, setNotifications] = useState(false)

    const toggleNotifications = () => {
        setNotifications(prev => !prev)

    }
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                </View>
                <View style={styles.noti}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <Switch
                        trackColor={{false: '#ffffff', true:'#34c759'}}
                        thumbColor={notifications ? '#FFFFFF' : '#ffffff'}
                        ios_backgroundColor='#ffffff'
                        onValueChange={toggleNotifications}
                        value={notifications}  
                    />
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
    noti: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666666',
    }
});

export default Settings;
