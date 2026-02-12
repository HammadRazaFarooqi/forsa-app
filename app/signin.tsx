import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../lib/firebase";
import i18n from "../locales/i18n";

type Errors = {
  email?: string;
  password?: string;
  submit?: string;
};

const SignInScreen = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Validation function
  const validate = () => {
    let errs: Errors = {};
    if (!emailOrPhone) errs.email = i18n.t("required");
    if (!password) errs.password = i18n.t("required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Signin handler with Firebase
  const handleSignin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Check if input is email or phone
      const isEmail = emailOrPhone.includes("@");
      let email = emailOrPhone;
      let authEmail = email;

      // If phone number, we need to find the user by phone in Firestore first
      if (!isEmail) {
        // Clean phone number (remove spaces, dashes, parentheses, dots, and + sign) - same format used in signup
        // Keep only digits for email generation
        const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)\.\+]/g, '');
        
        // Try to find user in Firestore to get the exact phone format used during signup
        let storedPhone = null;
        
        try {
          const usersRef = collection(db, "users");
          
          // Try multiple phone formats to find the user
          // Generate all possible variations of the phone number
          const phoneVariations = [
            cleanedPhone,                                    // Cleaned version (digits only)
            emailOrPhone.trim(),                             // Original format (trimmed)
            emailOrPhone.replace(/[\s\-\(\)\.]/g, ''),      // Without spaces/dashes/parentheses/dots but keep +
            emailOrPhone.replace(/\+/g, ''),                 // Without + sign
            emailOrPhone.replace(/[\s\-]/g, ''),            // Without spaces/dashes only
            emailOrPhone.replace(/[^\d+]/g, ''),            // Only digits and +
            emailOrPhone.replace(/[^\d]/g, ''),            // Only digits
          ];
          
          // Remove duplicates and empty strings
          const uniqueVariations = [...new Set(phoneVariations)].filter(v => v.length > 0);
          
          console.log("Searching for user with phone variations:", uniqueVariations);
          
          for (const phoneVar of uniqueVariations) {
            const phoneQuery = query(usersRef, where("phone", "==", phoneVar));
            const phoneSnapshot = await getDocs(phoneQuery);
            
            if (!phoneSnapshot.empty) {
              const userData = phoneSnapshot.docs[0].data();
              storedPhone = userData.phone; // Get the exact phone format stored in Firestore
              console.log("✅ Found user with phone format:", storedPhone);
              break;
            }
          }
        } catch (searchErr) {
          console.log("Phone search error (will try with cleaned phone):", searchErr);
        }
        
        // Generate email the same way as signup does
        // Format: user_{phone}@forsa.app
        // Use the stored phone if found, otherwise use cleaned input phone
        // Always clean the phone (remove all non-digits) for email generation
        const phoneForEmail = storedPhone 
          ? storedPhone.replace(/[\s\-\(\)\.\+]/g, '') 
          : cleanedPhone;
        
        authEmail = `user_${phoneForEmail}@forsa.app`;
        
        console.log("Attempting login with email:", authEmail);
        console.log("Phone used for email generation:", phoneForEmail);
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        authEmail,
        password
      );
      const user = userCredential.user;

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        throw new Error("User profile not found");
      }

      const userData = userDoc.data();
      const role = userData.role;

      // ✅ Navigate based on role
      switch (role) {
        case "player":
          router.replace("/player-feed");
          break;
        case "agent":
          router.replace("/agent-feed");
          break;
        case "academy":
          router.replace("/academy-home");
          break;
        case "parent":
          router.replace("/parent-feed");
          break;
        case "clinic":
          router.replace("/clinic-feed");
          break;
        default:
          Alert.alert("Error", "Unknown role");
      }
    } catch (err: any) {
      let errorMessage = i18n.t("loginFailed") || "Login failed";
      if (err.code === "auth/user-not-found") {
        errorMessage = i18n.t("userNotFound") || "User not found";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = i18n.t("incorrectPassword") || "Incorrect password";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = i18n.t("invalidEmailAddress") || "Invalid email address";
      } else if (err.code === "auth/invalid-credential") {
        // This error occurs when email/password combination is wrong
        // For phone login, it might mean the phone number format doesn't match
        errorMessage = i18n.t("invalidCredentials") || "Invalid phone number or password. Please check your credentials.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setErrors({ submit: errorMessage });
      Alert.alert(i18n.t("loginFailed") || "Login failed", errorMessage);
      console.error("❌ Login error:", err);
      console.error("❌ Attempted email:", authEmail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2d2d2d"]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>{i18n.t("welcome_back")}</Text>
            <Text style={styles.subtitleText}>
              {i18n.t("sign_in_to_continue")}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" && styles.inputWrapperFocused,
                  errors.email && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name={emailOrPhone.includes("@") ? "mail-outline" : "call-outline"}
                  size={20}
                  color={focusedInput === "email" ? "#000" : "#999"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("email_or_phone") || "Email or Phone"}
                  placeholderTextColor="#999"
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  keyboardType="default"
                  autoComplete="off"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "password" && styles.inputWrapperFocused,
                  errors.password && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === "password" ? "#000" : "#999"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("password")}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>
                {i18n.t("forgotPassword")}
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {errors.submit && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff3b30" />
                <Text style={styles.errorSubmitText}>{errors.submit}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                loading && styles.signInButtonDisabled,
              ]}
              onPress={handleSignin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>{i18n.t("sign_in")}</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>{i18n.t("dontHaveAccount")}</Text>
              <TouchableOpacity onPress={() => router.push("/role")}>
                <Text style={styles.signUpLink}>{i18n.t("signUp")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    position: "absolute",
    left: 20,
    top: Platform.OS === "ios" ? 40 : 30,
    zIndex: 2,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
    width: "100%",
  },
  welcomeText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center",
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    width: "100%",
    maxWidth: 440,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f5f5f5",
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  inputWrapperError: {
    borderColor: "#ff3b30",
    backgroundColor: "#fff5f5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorSubmitText: {
    color: "#ff3b30",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#666",
    fontSize: 14,
  },
  signUpLink: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
});

export default SignInScreen;
