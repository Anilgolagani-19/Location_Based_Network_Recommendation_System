import pickle

model = pickle.load(open("random_forest_model.pkl","rb"))
print(model.feature_names_in_)
print(model.n_features_in_)