import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../screens/Home";
import Trains from "../screens/Trains";
import Busses from "../screens/Busses";
import Settings from "../screens/Settings";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Tab = createBottomTabNavigator();

// Map route names to icon names
const ICONS = {
    Home: "home",
    Trains: "train",
    Busses: "bus",
    Settings: "cog",
};

function BottomTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => (
                    <Icon name={ICONS[route.name]} size={size} color={color} />
                ),
                tabBarActiveTintColor: "tomato",
                tabBarInactiveTintColor: "gray",
                headerShown: false, // Hide the header for each screen
            })}
        >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Trains" component={Trains} />
            <Tab.Screen name="Busses" component={Busses} />
            <Tab.Screen name="Settings" component={Settings} />
        </Tab.Navigator>
    );
}

export default BottomTabs;