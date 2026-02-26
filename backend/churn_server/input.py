import pickle
m = pickle.load(open("telecom_models_dictionary.pkl","rb"))
print(m.n_features_in_)